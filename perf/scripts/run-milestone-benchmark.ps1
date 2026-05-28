<#
.SYNOPSIS
Runs milestone-based capacity benchmark (100, 500, 1000, 1500, 2000 VUs) with per-milestone server metrics.

.DESCRIPTION
This script runs sequential k6 load tests at defined milestones. After each milestone it queries
Prometheus for detailed server-side metrics (HTTP, Node.js, Redis, BullMQ, Socket, VPS) and
produces a consolidated Markdown report with min/max/avg per milestone.

.EXAMPLE
.\run-milestone-benchmark.ps1 -BaseUrl "https://api2.hepza.click" -PrometheusUrl "http://localhost:9090"
.\run-milestone-benchmark.ps1 -BaseUrl "https://api2.hepza.click" -Milestones @(100,500,1000) -SkipSeed
#>
param(
    [string]$BaseUrl = "https://api2.hepza.click",
    [int[]]$Milestones = @(100, 500, 1000, 1500, 2000),
    [string]$RampDuration = "2m",
    [string]$HoldDuration = "3m",
    [string]$PrometheusUrl = "http://localhost:9090",
    [string]$GrafanaUrl = "http://localhost:3002",
    [switch]$SkipSeed,
    [switch]$SkipMonitoring
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Resolve-Path (Join-Path $scriptDir "../..")
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$resultsDir = Join-Path $rootDir "perf/results/milestone-benchmark/$timestamp"
New-Item -ItemType Directory -Force -Path $resultsDir | Out-Null

$perfVolume = "$($rootDir.Path.Replace('\', '/'))/perf"

# ── Helper: Format values ──
function Format-Bytes($val) {
    if ($null -eq $val -or $val -eq 'N/A' -or $val -eq 'query_failed') { return 'N/A' }
    "{0:N1} MB" -f ([double]$val / 1048576)
}
function Format-Ms($val) {
    if ($null -eq $val -or $val -eq 'N/A' -or $val -eq 'query_failed') { return 'N/A' }
    "{0:N1} ms" -f ([double]$val * 1000)
}
function Format-Num($val, $decimals = 2) {
    if ($null -eq $val -or $val -eq 'N/A' -or $val -eq 'query_failed') { return 'N/A' }
    "{0:N$decimals}" -f [double]$val
}
function Format-Percent($val) {
    if ($null -eq $val -or $val -eq 'N/A' -or $val -eq 'query_failed') { return 'N/A' }
    "{0:N1}%" -f [double]$val
}

# ── Helper: Query Prometheus range ──
function Invoke-PromRangeQuery {
    param($Query, $Start, $End, $Step = "15s")
    try {
        $encoded = [System.Uri]::EscapeDataString($Query)
        $url = "$PrometheusUrl/api/v1/query_range?query=$encoded&start=$Start&end=$End&step=$Step"
        $response = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 30
        if ($response.data.result.Count -eq 0) {
            return @{ min = $null; max = $null; avg = $null; count = 0; error = $null }
        }
        $vals = $response.data.result[0].values | ForEach-Object {
            $v = $null
            [double]::TryParse($_[1], [ref]$v) | Out-Null
            if (($null -ne $v) -and (-not [double]::IsNaN($v))) { $v }
        } | Where-Object { $null -ne $_ }
        if ($vals.Count -eq 0) {
            return @{ min = $null; max = $null; avg = $null; count = 0; error = $null }
        }
        $min = ($vals | Measure-Object -Minimum).Minimum
        $max = ($vals | Measure-Object -Maximum).Maximum
        $avg = ($vals | Measure-Object -Average).Average
        return @{ min = $min; max = $max; avg = $avg; count = $vals.Count; error = $null }
    } catch {
        return @{ min = $null; max = $null; avg = $null; count = 0; error = $_.Exception.Message }
    }
}

# ── Prometheus queries ──
$promQueries = @{
    # HTTP performance
    http_rps            = 'sum(rate(hepza_http_requests_total{route!="/api/metrics"}[1m]))'
    http_latency_p50    = 'histogram_quantile(0.50, sum by (le) (rate(hepza_http_request_duration_seconds_bucket{route!="/api/metrics"}[1m])))'
    http_latency_p95    = 'histogram_quantile(0.95, sum by (le) (rate(hepza_http_request_duration_seconds_bucket{route!="/api/metrics"}[1m])))'
    http_latency_p99    = 'histogram_quantile(0.99, sum by (le) (rate(hepza_http_request_duration_seconds_bucket{route!="/api/metrics"}[1m])))'
    http_error_5xx_rate = 'sum(rate(hepza_http_requests_total{status_code=~"5..",route!="/api/metrics"}[1m])) or vector(0)'
    http_error_429_rate = 'sum(rate(hepza_http_requests_total{status_code="429",route!="/api/metrics"}[1m])) or vector(0)'
    http_error_4xx_rate = 'sum(rate(hepza_http_requests_total{status_code=~"4..",route!="/api/metrics"}[1m])) or vector(0)'
    http_in_flight      = 'sum(hepza_http_requests_in_flight) or vector(0)'

    # Node.js / Process (prom-client collectDefaultMetrics with hepza_ prefix)
    api_memory_rss      = 'hepza_process_resident_memory_bytes'
    api_heap_used       = 'hepza_nodejs_heap_size_used_bytes or vector(0)'
    api_event_loop_lag  = 'hepza_nodejs_eventloop_lag_seconds or vector(0)'
    api_http_conn       = 'hepza_nodejs_http_connections or vector(0)'

    # VPS
    vps_cpu_percent     = '100 * (1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m]))) or vector(0)'
    vps_memory_percent  = '100 * (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) or vector(0)'

    # Redis
    redis_memory        = 'redis_memory_used_bytes or vector(0)'
    redis_clients       = 'redis_connected_clients or vector(0)'
    redis_commands_sec  = 'rate(redis_commands_processed_total[1m]) or vector(0)'

    # Cache
    cache_hits          = 'sum(rate(hepza_cache_operations_total{result="hit"}[1m])) or vector(0)'
    cache_misses        = 'sum(rate(hepza_cache_operations_total{result="miss"}[1m])) or vector(0)'

    # MongoDB Pool
    mongodb_pool_size      = 'hepza_mongodb_pool_size or vector(0)'
    mongodb_pool_active    = 'hepza_mongodb_pool_active or vector(0)'
    mongodb_pool_available = 'hepza_mongodb_pool_available or vector(0)'
    mongodb_pool_pending   = 'hepza_mongodb_pool_pending or vector(0)'

    # Socket
    socket_connections  = 'sum(hepza_socket_connections) or vector(0)'
    socket_auth_users   = 'sum(hepza_socket_authenticated_users) or vector(0)'

    # BullMQ
    bullmq_waiting      = 'sum(hepza_bullmq_jobs{state="waiting"}) or vector(0)'
    bullmq_active       = 'sum(hepza_bullmq_jobs{state="active"}) or vector(0)'
    bullmq_failed       = 'sum(hepza_bullmq_jobs{state="failed"}) or vector(0)'

    # Nginx
    nginx_active_conn   = 'nginx_connections_active or vector(0)'
    nginx_rps           = 'rate(nginx_http_requests_total[1m]) or vector(0)'
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "HEPZA Milestone Benchmark" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Base URL:     $BaseUrl"
Write-Host "Milestones:   $($Milestones -join ', ')"
Write-Host "Ramp:         $RampDuration"
Write-Host "Hold:         $HoldDuration"
Write-Host "Prometheus:   $PrometheusUrl"
Write-Host "Output:       $resultsDir"
Write-Host "========================================" -ForegroundColor Cyan

# ── Step 1: Verify monitoring stack ──
if (-not $SkipMonitoring) {
    Write-Host "`n[1/4] Verifying monitoring stack..." -ForegroundColor Yellow
    try {
        $promCheck = Invoke-RestMethod -Uri "$PrometheusUrl/api/v1/status/config" -Method Get -TimeoutSec 5 -ErrorAction Stop
        Write-Host "  Prometheus: OK" -ForegroundColor Green
    } catch {
        Write-Host "  Prometheus not reachable at $PrometheusUrl" -ForegroundColor Red
        Write-Host "  TIP: SSH tunnel: ssh -L 9090:127.0.0.1:9090 user@vps" -ForegroundColor DarkGray
        throw "Monitoring stack not reachable. Start it or use -SkipMonitoring."
    }
} else {
    Write-Host "`n[1/4] Skipping monitoring check (--SkipMonitoring)" -ForegroundColor DarkGray
}

# ── Step 2: Seed test users (once for max milestone) ──
$maxVUs = ($Milestones | Measure-Object -Maximum).Maximum
if (-not $SkipSeed) {
    Write-Host "`n[2/4] Seeding $maxVUs test users..." -ForegroundColor Yellow
    $dashboard     = [Math]::Floor($maxVUs * 0.25)
    $history       = [Math]::Floor($maxVUs * 0.10)
    $declaration   = [Math]::Floor($maxVUs * 0.15)
    $declHistory   = [Math]::Floor($maxVUs * 0.10)
    $notification  = [Math]::Floor($maxVUs * 0.10)
    $exportLight   = [Math]::Floor($maxVUs * 0.05)
    $manager       = [Math]::Floor($maxVUs * 0.10)
    $admin         = [Math]::Floor($maxVUs * 0.05)
    $remaining     = $maxVUs - ($dashboard + $history + $declaration + $declHistory + $notification + $exportLight + $manager + $admin)
    $dashboard    += $remaining

    $flowCounts = @{
        company_dashboard    = $dashboard
        company_history      = $history
        resource_declaration = $declaration
        declaration_history  = $declHistory
        notification_reader  = $notification
        export_light         = $exportLight
        manager_monitor      = $manager
        admin_overview       = $admin
    } | ConvertTo-Json -Compress

    $env:PERF_FLOW_COUNTS_JSON = $flowCounts
    Write-Host "  Flow distribution: $flowCounts"

    Push-Location $rootDir
    try {
        node ServerSide/scripts/seedPerformanceUsers.js --csv "perf/data/users.prod.csv"
    } finally {
        Pop-Location
    }
} else {
    Write-Host "`n[2/4] Skipping user seeding (--SkipSeed)" -ForegroundColor DarkGray
}

# ── Step 3: Run milestones sequentially ──
Write-Host "`n[3/4] Running milestone benchmarks..." -ForegroundColor Yellow

$milestoneResults = @()

foreach ($vus in $Milestones) {
    Write-Host "`n----------------------------------------" -ForegroundColor Cyan
    Write-Host "MILESTONE: $vus VUs" -ForegroundColor Cyan
    Write-Host "----------------------------------------" -ForegroundColor Cyan

    $milestoneDir = Join-Path $resultsDir "milestone-$vus"
    New-Item -ItemType Directory -Force -Path $milestoneDir | Out-Null

    $milestoneStart = [DateTimeOffset]::UtcNow
    Write-Host "  Started at: $($milestoneStart.ToLocalTime().ToString('HH:mm:ss'))"

    # Run k6
    $k6Args = @(
        "run", "--rm", "-i",
        "-e", "BASE_URL=$BaseUrl",
        "-e", "MILESTONE_VUS=$vus",
        "-e", "MILESTONE_RAMP=$RampDuration",
        "-e", "MILESTONE_HOLD=$HoldDuration",
        "-e", "USER_CSV=../../data/users.prod.csv",
        "-v", "${perfVolume}:/perf",
        "grafana/k6:0.49.0",
        "run",
        "--summary-export", "/perf/results/milestone-benchmark/$timestamp/milestone-$vus/summary.json",
        "/perf/k6/milestone-benchmark.js"
    )

    $k6Proc = Start-Process -FilePath "docker" -ArgumentList $k6Args -NoNewWindow -Wait -PassThru
    $milestoneEnd = [DateTimeOffset]::UtcNow
    Write-Host "  Finished at: $($milestoneEnd.ToLocalTime().ToString('HH:mm:ss'))"
    Write-Host "  K6 exit code: $($k6Proc.ExitCode)"

    # Read k6 summary
    $summaryPath = Join-Path $milestoneDir "summary.json"
    $k6Summary = $null
    if (Test-Path $summaryPath) {
        $k6Summary = Get-Content $summaryPath -Raw | ConvertFrom-Json
    }

    # Wait for Prometheus to scrape final data
    if (-not $SkipMonitoring) {
        Write-Host "  Waiting 30s for Prometheus scrape..." -ForegroundColor DarkGray
        Start-Sleep -Seconds 30
    }

    # Query Prometheus
    $promData = @{}
    if (-not $SkipMonitoring) {
        $promStart = $milestoneStart.ToUnixTimeSeconds()
        $promEnd = $milestoneEnd.AddSeconds(30).ToUnixTimeSeconds()

        foreach ($q in $promQueries.GetEnumerator()) {
            $promData[$q.Key] = Invoke-PromRangeQuery -Query $q.Value -Start $promStart -End $promEnd
        }
    }

    # Extract key K6 metrics safely
    $k6HttpReqs = if ($k6Summary.metrics.http_reqs) { $k6Summary.metrics.http_reqs.count } else { $null }
    $k6Rps = if ($k6Summary.metrics.http_reqs) { $k6Summary.metrics.http_reqs.rate } else { $null }
    $k6AvgLat = if ($k6Summary.metrics.http_req_duration) { $k6Summary.metrics.http_req_duration.avg } else { $null }
    $k6MinLat = if ($k6Summary.metrics.http_req_duration) { $k6Summary.metrics.http_req_duration.min } else { $null }
    $k6MaxLat = if ($k6Summary.metrics.http_req_duration) { $k6Summary.metrics.http_req_duration.max } else { $null }
    $k6P95 = if ($k6Summary.metrics.http_req_duration) { $k6Summary.metrics.http_req_duration.'p(95)' } else { $null }
    $k6P99 = if ($k6Summary.metrics.http_req_duration) { $k6Summary.metrics.http_req_duration.'p(99)' } else { $null }
    $k6ErrorRate = if ($k6Summary.metrics.http_req_failed) { $k6Summary.metrics.http_req_failed.rate } else { $null }
    $k6VusMax = if ($k6Summary.state) { $k6Summary.state.vusMax } else { $null }
    $k6Iterations = if ($k6Summary.metrics.iterations) { $k6Summary.metrics.iterations.count } else { $null }

    $resultObj = [PSCustomObject]@{
        VUs = $vus
        StartTime = $milestoneStart
        EndTime = $milestoneEnd
        K6 = @{
            http_reqs = $k6HttpReqs
            rps = $k6Rps
            latency_avg = $k6AvgLat
            latency_min = $k6MinLat
            latency_max = $k6MaxLat
            latency_p95 = $k6P95
            latency_p99 = $k6P99
            error_rate = $k6ErrorRate
            vus_max = $k6VusMax
            iterations = $k6Iterations
            raw = $k6Summary
        }
        Prometheus = $promData
    }
    $milestoneResults += $resultObj

    # Save raw per-milestone JSON
    $resultObj | Select-Object VUs, StartTime, EndTime, K6, Prometheus | ConvertTo-Json -Depth 15 | Out-File -FilePath (Join-Path $milestoneDir "milestone-data.json") -Encoding UTF8

    Write-Host "  Milestone $vus complete." -ForegroundColor Green

    # Safety break if error rate exceeds 10%
    if ($k6ErrorRate -and $k6ErrorRate -gt 0.10) {
        Write-Host "`nERROR RATE EXCEEDED 10% ($([math]::Round($k6ErrorRate*100,1))%). Stopping benchmark." -ForegroundColor Red
        break
    }

    # Cool-down between milestones
    if ($vus -ne $Milestones[-1]) {
        Write-Host "  Cool-down 60s before next milestone..." -ForegroundColor DarkGray
        Start-Sleep -Seconds 60
    }
}

# ── Step 4: Generate consolidated report ──
Write-Host "`n[4/4] Generating consolidated report..." -ForegroundColor Yellow

$reportPath = Join-Path $resultsDir "milestone-report.md"

$reportLines = @()
$reportLines += "# HEPZA Milestone Benchmark Report"
$reportLines += ""
$reportLines += "**Generated:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$reportLines += "**Base URL:** $BaseUrl"
$reportLines += "**Ramp Duration:** $RampDuration"
$reportLines += "**Hold Duration:** $HoldDuration"
$reportLines += ""
$reportLines += "---"
$reportLines += ""

# Overview table
$reportLines += "## Tổng quan / Overview"
$reportLines += ""
$reportLines += "| Milestone | K6 Requests | K6 RPS | Latency Avg | Latency p95 | Latency p99 | Error Rate | Max VUs |"
$reportLines += "|-----------|-------------|--------|-------------|-------------|-------------|------------|---------|"
foreach ($r in $milestoneResults) {
    $vus = $r.VUs
    $reqs = Format-Num $r.K6.http_reqs 0
    $rps = Format-Num $r.K6.rps
    $avg = Format-Ms $r.K6.latency_avg
    $p95 = Format-Ms $r.K6.latency_p95
    $p99 = Format-Ms $r.K6.latency_p99
    $err = if ($r.K6.error_rate) { "{0:N2}%" -f ($r.K6.error_rate * 100) } else { 'N/A' }
    $maxV = $r.K6.vus_max
    $reportLines += "| $vus | $reqs | $rps | $avg | $p95 | $p99 | $err | $maxV |"
}
$reportLines += ""
$reportLines += "---"
$reportLines += ""

# Per-milestone details
foreach ($r in $milestoneResults) {
    $vus = $r.VUs
    $p = $r.Prometheus

    $reportLines += "## Chi tiết Milestone $vus VUs"
    $reportLines += ""
    $reportLines += "**Thời gian:** $($r.StartTime.ToLocalTime().ToString('HH:mm:ss')) → $($r.EndTime.ToLocalTime().ToString('HH:mm:ss'))"
    $reportLines += ""

    # K6 Metrics
    $reportLines += "### K6 Client Metrics"
    $reportLines += ""
    $reportLines += "| Metric | Value |"
    $reportLines += "|--------|-------|"
    $reportLines += "| Total HTTP Requests | $(Format-Num $r.K6.http_reqs 0) |"
    $reportLines += "| HTTP RPS | $(Format-Num $r.K6.rps) |"
    $reportLines += "| Iterations | $(Format-Num $r.K6.iterations 0) |"
    $reportLines += "| Latency Min | $(Format-Ms $r.K6.latency_min) |"
    $reportLines += "| Latency Avg | $(Format-Ms $r.K6.latency_avg) |"
    $reportLines += "| Latency Max | $(Format-Ms $r.K6.latency_max) |"
    $reportLines += "| Latency p95 | $(Format-Ms $r.K6.latency_p95) |"
    $reportLines += "| Latency p99 | $(Format-Ms $r.K6.latency_p99) |"
    $reportLines += "| Error Rate | $(if ($r.K6.error_rate) { "{0:N2}%" -f ($r.K6.error_rate * 100) } else { 'N/A' }) |"
    $reportLines += "| Max VUs | $($r.K6.vus_max) |"
    $reportLines += ""

    if ($p.Count -gt 0) {
        # HTTP Performance
        $reportLines += "### Server HTTP Performance (Prometheus)"
        $reportLines += ""
        $reportLines += "| Metric | Min | Max | Avg |"
        $reportLines += "|--------|-----|-----|-----|"
        $reportLines += "| HTTP RPS (req/s) | $(Format-Num $p.http_rps.min) | $(Format-Num $p.http_rps.max) | $(Format-Num $p.http_rps.avg) |"
        $reportLines += "| Latency p50 | $(Format-Ms $p.http_latency_p50.min) | $(Format-Ms $p.http_latency_p50.max) | $(Format-Ms $p.http_latency_p50.avg) |"
        $reportLines += "| Latency p95 | $(Format-Ms $p.http_latency_p95.min) | $(Format-Ms $p.http_latency_p95.max) | $(Format-Ms $p.http_latency_p95.avg) |"
        $reportLines += "| Latency p99 | $(Format-Ms $p.http_latency_p99.min) | $(Format-Ms $p.http_latency_p99.max) | $(Format-Ms $p.http_latency_p99.avg) |"
        $reportLines += "| 5xx Error Rate (/s) | $(Format-Num $p.http_error_5xx_rate.min) | $(Format-Num $p.http_error_5xx_rate.max) | $(Format-Num $p.http_error_5xx_rate.avg) |"
        $reportLines += "| 429 Rate Limit (/s) | $(Format-Num $p.http_error_429_rate.min) | $(Format-Num $p.http_error_429_rate.max) | $(Format-Num $p.http_error_429_rate.avg) |"
        $reportLines += "| 4xx Error Rate (/s) | $(Format-Num $p.http_error_4xx_rate.min) | $(Format-Num $p.http_error_4xx_rate.max) | $(Format-Num $p.http_error_4xx_rate.avg) |"
        $reportLines += "| In-Flight Requests | $(Format-Num $p.http_in_flight.min 0) | $(Format-Num $p.http_in_flight.max 0) | $(Format-Num $p.http_in_flight.avg 0) |"
        $reportLines += ""

        # Node.js
        $reportLines += "### Node.js / Process Metrics"
        $reportLines += ""
        $reportLines += "| Metric | Min | Max | Avg |"
        $reportLines += "|--------|-----|-----|-----|"
        $reportLines += "| Memory RSS | $(Format-Bytes $p.api_memory_rss.min) | $(Format-Bytes $p.api_memory_rss.max) | $(Format-Bytes $p.api_memory_rss.avg) |"
        $reportLines += "| Heap Used | $(Format-Bytes $p.api_heap_used.min) | $(Format-Bytes $p.api_heap_used.max) | $(Format-Bytes $p.api_heap_used.avg) |"
        $reportLines += "| Event Loop Lag | $(Format-Ms $p.api_event_loop_lag.min) | $(Format-Ms $p.api_event_loop_lag.max) | $(Format-Ms $p.api_event_loop_lag.avg) |"
        $reportLines += "| HTTP Connections | $(Format-Num $p.api_http_conn.min 0) | $(Format-Num $p.api_http_conn.max 0) | $(Format-Num $p.api_http_conn.avg 0) |"
        $reportLines += ""

        # VPS
        $reportLines += "### VPS / Infrastructure Metrics"
        $reportLines += ""
        $reportLines += "| Metric | Min | Max | Avg |"
        $reportLines += "|--------|-----|-----|-----|"
        $reportLines += "| CPU Usage | $(Format-Percent $p.vps_cpu_percent.min) | $(Format-Percent $p.vps_cpu_percent.max) | $(Format-Percent $p.vps_cpu_percent.avg) |"
        $reportLines += "| Memory Usage | $(Format-Percent $p.vps_memory_percent.min) | $(Format-Percent $p.vps_memory_percent.max) | $(Format-Percent $p.vps_memory_percent.avg) |"
        $reportLines += ""

        # Redis
        $reportLines += "### Redis Metrics"
        $reportLines += ""
        $reportLines += "| Metric | Min | Max | Avg |"
        $reportLines += "|--------|-----|-----|-----|"
        $reportLines += "| Memory Used | $(Format-Bytes $p.redis_memory.min) | $(Format-Bytes $p.redis_memory.max) | $(Format-Bytes $p.redis_memory.avg) |"
        $reportLines += "| Connected Clients | $(Format-Num $p.redis_clients.min 0) | $(Format-Num $p.redis_clients.max 0) | $(Format-Num $p.redis_clients.avg 0) |"
        $reportLines += "| Commands/sec | $(Format-Num $p.redis_commands_sec.min) | $(Format-Num $p.redis_commands_sec.max) | $(Format-Num $p.redis_commands_sec.avg) |"
        $reportLines += ""

        # Cache
        $reportLines += "### Cache Metrics"
        $reportLines += ""
        $reportLines += "| Metric | Min | Max | Avg |"
        $reportLines += "|--------|-----|-----|-----|"
        $reportLines += "| Cache Hits/sec | $(Format-Num $p.cache_hits.min) | $(Format-Num $p.cache_hits.max) | $(Format-Num $p.cache_hits.avg) |"
        $reportLines += "| Cache Misses/sec | $(Format-Num $p.cache_misses.min) | $(Format-Num $p.cache_misses.max) | $(Format-Num $p.cache_misses.avg) |"
        $reportLines += ""

        # MongoDB Pool
        $reportLines += "### MongoDB Pool Metrics"
        $reportLines += ""
        $reportLines += "| Metric | Min | Max | Avg |"
        $reportLines += "|--------|-----|-----|-----|"
        $reportLines += "| Pool Size | $(Format-Num $p.mongodb_pool_size.min 0) | $(Format-Num $p.mongodb_pool_size.max 0) | $(Format-Num $p.mongodb_pool_size.avg 0) |"
        $reportLines += "| Pool Active | $(Format-Num $p.mongodb_pool_active.min 0) | $(Format-Num $p.mongodb_pool_active.max 0) | $(Format-Num $p.mongodb_pool_active.avg 0) |"
        $reportLines += "| Pool Available | $(Format-Num $p.mongodb_pool_available.min 0) | $(Format-Num $p.mongodb_pool_available.max 0) | $(Format-Num $p.mongodb_pool_available.avg 0) |"
        $reportLines += "| Pool Pending | $(Format-Num $p.mongodb_pool_pending.min 0) | $(Format-Num $p.mongodb_pool_pending.max 0) | $(Format-Num $p.mongodb_pool_pending.avg 0) |"
        $reportLines += ""

        # Socket
        $reportLines += "### Socket.IO Metrics"
        $reportLines += ""
        $reportLines += "| Metric | Min | Max | Avg |"
        $reportLines += "|--------|-----|-----|-----|"
        $reportLines += "| Socket Connections | $(Format-Num $p.socket_connections.min 0) | $(Format-Num $p.socket_connections.max 0) | $(Format-Num $p.socket_connections.avg 0) |"
        $reportLines += "| Authenticated Users | $(Format-Num $p.socket_auth_users.min 0) | $(Format-Num $p.socket_auth_users.max 0) | $(Format-Num $p.socket_auth_users.avg 0) |"
        $reportLines += ""

        # BullMQ
        $reportLines += "### BullMQ Queue Metrics"
        $reportLines += ""
        $reportLines += "| Metric | Min | Max | Avg |"
        $reportLines += "|--------|-----|-----|-----|"
        $reportLines += "| Waiting Jobs | $(Format-Num $p.bullmq_waiting.min 0) | $(Format-Num $p.bullmq_waiting.max 0) | $(Format-Num $p.bullmq_waiting.avg 0) |"
        $reportLines += "| Active Jobs | $(Format-Num $p.bullmq_active.min 0) | $(Format-Num $p.bullmq_active.max 0) | $(Format-Num $p.bullmq_active.avg 0) |"
        $reportLines += "| Failed Jobs | $(Format-Num $p.bullmq_failed.min 0) | $(Format-Num $p.bullmq_failed.max 0) | $(Format-Num $p.bullmq_failed.avg 0) |"
        $reportLines += ""

        # Nginx
        $reportLines += "### Nginx Metrics"
        $reportLines += ""
        $reportLines += "| Metric | Min | Max | Avg |"
        $reportLines += "|--------|-----|-----|-----|"
        $reportLines += "| Active Connections | $(Format-Num $p.nginx_active_conn.min 0) | $(Format-Num $p.nginx_active_conn.max 0) | $(Format-Num $p.nginx_active_conn.avg 0) |"
        $reportLines += "| Nginx RPS | $(Format-Num $p.nginx_rps.min) | $(Format-Num $p.nginx_rps.max) | $(Format-Num $p.nginx_rps.avg) |"
        $reportLines += ""
    }

    $reportLines += "---"
    $reportLines += ""
}

# Summary / Analysis
$reportLines += "## Phân tích xu hướng / Trend Analysis"
$reportLines += ""
$reportLines += "| Milestone | RPS tăng | p95 tăng | RSS tăng | CPU tăng | Redis Clients tăng |"
$reportLines += "|-----------|----------|----------|----------|----------|-------------------|"
$prev = $null
foreach ($r in $milestoneResults) {
    $vus = $r.VUs
    if ($prev) {
        $rpsDelta = if ($r.K6.rps -and $prev.K6.rps) { "{0:N1}x" -f ($r.K6.rps / $prev.K6.rps) } else { '-' }
        $p95Delta = if ($r.K6.latency_p95 -and $prev.K6.latency_p95) { "{0:N1}x" -f ($r.K6.latency_p95 / $prev.K6.latency_p95) } else { '-' }
        $rssDelta = if ($r.Prometheus.api_memory_rss -and $r.Prometheus.api_memory_rss.avg -and $prev.Prometheus.api_memory_rss -and $prev.Prometheus.api_memory_rss.avg) {
            "{0:N1}x" -f ($r.Prometheus.api_memory_rss.avg / $prev.Prometheus.api_memory_rss.avg)
        } else { '-' }
        $cpuDelta = if ($r.Prometheus.vps_cpu_percent -and $r.Prometheus.vps_cpu_percent.avg -and $prev.Prometheus.vps_cpu_percent -and $prev.Prometheus.vps_cpu_percent.avg) {
            "{0:N1}x" -f ($r.Prometheus.vps_cpu_percent.avg / $prev.Prometheus.vps_cpu_percent.avg)
        } else { '-' }
        $redisDelta = if ($r.Prometheus.redis_clients -and $r.Prometheus.redis_clients.avg -and $prev.Prometheus.redis_clients -and $prev.Prometheus.redis_clients.avg) {
            "{0:N1}x" -f ($r.Prometheus.redis_clients.avg / $prev.Prometheus.redis_clients.avg)
        } else { '-' }
        $reportLines += "| $vus | $rpsDelta | $p95Delta | $rssDelta | $cpuDelta | $redisDelta |"
    } else {
        $reportLines += "| $vus | baseline | baseline | baseline | baseline | baseline |"
    }
    $prev = $r
}
$reportLines += ""
$reportLines += "*Ghi chú: `tăng` = tỷ lệ so với milestone trước đó (ví dụ: 2.0x = gấp đôi).*"
$reportLines += ""

$reportLines += "## Ngưỡng cảnh báo / Thresholds"
$reportLines += ""
$reportLines += "| Ngưỡng | Giá trị | Ý nghĩa |"
$reportLines += "|--------|---------|---------|"
$reportLines += "| HTTP p95 read | ≤ 3000 ms | Thời gian phản hồi 95% request đọc |"
$reportLines += "| HTTP p99 read | ≤ 5000 ms | Thời gian phản hồi 99% request đọc |"
$reportLines += "| HTTP p95 write | ≤ 5000 ms | Thời gian phản hồi 95% request ghi |"
$reportLines += "| HTTP p99 write | ≤ 8000 ms | Thời gian phản hồi 99% request ghi |"
$reportLines += "| Error rate | < 1% | Tỷ lệ lỗi HTTP chấp nhận được |"
$reportLines += "| VPS CPU | < 85% | CPU không quá tải kéo dài |"
$reportLines += "| VPS Memory | < 90% | Tránh OOM kill |"
$reportLines += ""

$reportLines += "---"
$reportLines += ""
$reportLines += "*Report được tạo tự động bởi `run-milestone-benchmark.ps1`.*"

$reportLines -join "`n" | Out-File -FilePath $reportPath -Encoding UTF8

# Also save raw JSON for programmatic access
$milestoneResults | Select-Object VUs, @{N='StartTime';E={$_.StartTime.ToString('o')}}, @{N='EndTime';E={$_.EndTime.ToString('o')}}, K6, Prometheus | ConvertTo-Json -Depth 15 | Out-File -FilePath (Join-Path $resultsDir "milestone-raw-data.json") -Encoding UTF8

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Milestone Benchmark Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Report:       $reportPath"
Write-Host "Raw JSON:     $resultsDir\milestone-raw-data.json"
foreach ($r in $milestoneResults) {
    Write-Host "Milestone $($r.VUs):    $resultsDir\milestone-$($r.VUs)\summary.json"
}
Write-Host "========================================" -ForegroundColor Cyan
