<#
.SYNOPSIS
Automatically captures Grafana dashboard snapshot and Prometheus metrics as benchmark evidence.

.DESCRIPTION
This script runs AFTER the K6 benchmark completes. It:
1. Creates a Grafana Dashboard Snapshot (permanent shareable link)
2. Queries Prometheus for server-side metrics at the time of the test
3. Saves everything as JSON + Markdown report to the results directory

All evidence is saved automatically — no manual screenshots needed.

.EXAMPLE
.\capture-benchmark-evidence.ps1 -ResultsDir "perf/results/local-benchmark/20260426-191254"
#>
param(
    [Parameter(Mandatory=$true)]
    [string]$ResultsDir,

    [string]$GrafanaUrl = "http://localhost:3001",
    [string]$PrometheusUrl = "http://localhost:9090",
    [string]$GrafanaUser = "admin",
    [string]$GrafanaPassword = "admin",
    [string]$DashboardUid = "hepza-overview",

    # How far back to capture (default: 30 minutes)
    [int]$LookbackMinutes = 30
)

$ErrorActionPreference = 'Stop'

$evidenceDir = Join-Path $ResultsDir "evidence"
New-Item -ItemType Directory -Force -Path $evidenceDir | Out-Null

$authHeader = @{
    Authorization = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${GrafanaUser}:${GrafanaPassword}"))
}

$now = [DateTimeOffset]::UtcNow
$from = $now.AddMinutes(-$LookbackMinutes).ToUnixTimeMilliseconds()
$to = $now.ToUnixTimeMilliseconds()

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Capturing Benchmark Evidence" -ForegroundColor Cyan
Write-Host "Time range: last ${LookbackMinutes} minutes"
Write-Host "Evidence directory: $evidenceDir"
Write-Host "========================================" -ForegroundColor Cyan

# ── Step 1: Create Grafana Dashboard Snapshot ──
Write-Host "`n[1/3] Creating Grafana dashboard snapshot..." -ForegroundColor Yellow

try {
    # Get dashboard model
    $dashResponse = Invoke-RestMethod -Uri "$GrafanaUrl/api/dashboards/uid/$DashboardUid" -Headers $authHeader -Method Get
    $dashboardModel = $dashResponse.dashboard

    # Override time range to test window
    $dashboardModel.time = @{ from = "now-${LookbackMinutes}m"; to = "now" }

    # Create snapshot
    $snapshotBody = @{
        dashboard = $dashboardModel
        name      = "Benchmark Evidence - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        expires   = 0  # Never expires
    } | ConvertTo-Json -Depth 20 -Compress

    $snapshotResponse = Invoke-RestMethod -Uri "$GrafanaUrl/api/snapshots" -Headers $authHeader -Method Post -Body $snapshotBody -ContentType "application/json"

    $snapshotUrl = $snapshotResponse.url
    Write-Host "  Snapshot URL: $snapshotUrl" -ForegroundColor Green

    # Save snapshot info
    $snapshotResponse | ConvertTo-Json -Depth 5 | Out-File -FilePath (Join-Path $evidenceDir "grafana-snapshot.json") -Encoding UTF8
} catch {
    Write-Host "  Warning: Could not create Grafana snapshot: $_" -ForegroundColor DarkYellow
    $snapshotUrl = "N/A (Grafana not reachable)"
}

# ── Step 2: Query Prometheus for server metrics ──
Write-Host "`n[2/3] Querying Prometheus for server-side metrics..." -ForegroundColor Yellow

$promQueries = @{
    # HTTP metrics
    "http_rps"              = 'sum(rate(hepza_http_requests_total{route!="/api/metrics"}[1m]))'
    "http_latency_p95_sec"  = 'histogram_quantile(0.95, sum by (le) (rate(hepza_http_request_duration_seconds_bucket{route!="/api/metrics"}[5m])))'
    "http_latency_p99_sec"  = 'histogram_quantile(0.99, sum by (le) (rate(hepza_http_request_duration_seconds_bucket{route!="/api/metrics"}[5m])))'
    "http_error_5xx_rate"   = 'sum(rate(hepza_http_requests_total{status_code=~"5..",route!="/api/metrics"}[5m])) or vector(0)'
    "http_429_rate"         = 'sum(rate(hepza_http_requests_total{status_code="429",route!="/api/metrics"}[5m])) or vector(0)'
    "http_in_flight"        = 'sum(hepza_http_requests_in_flight) or vector(0)'

    # Process metrics (custom collectors + prom-client defaults as fallback)
    "api_memory_rss_bytes"  = 'hepza_process_resident_memory_bytes'
    "api_heap_bytes"        = 'hepza_nodejs_heap_used_bytes or hepza_nodejs_heap_size_used_bytes or vector(0)'
    "api_event_loop_lag_s"  = 'hepza_nodejs_eventloop_lag_runtime_seconds or hepza_nodejs_eventloop_lag_seconds or vector(0)'

    # Redis metrics
    "redis_memory_bytes"    = 'redis_memory_used_bytes or vector(0)'
    "redis_clients"         = 'redis_connected_clients or vector(0)'
    "redis_commands_per_sec" = 'rate(redis_commands_processed_total[1m]) or vector(0)'

    # Cache metrics
    "cache_hits_per_sec"    = 'sum(rate(hepza_cache_operations_total{result="hit"}[1m])) or vector(0)'
    "cache_misses_per_sec"  = 'sum(rate(hepza_cache_operations_total{result="miss"}[1m])) or vector(0)'

    # Socket metrics
    "socket_connections"    = 'sum(hepza_socket_connections) or vector(0)'
    "socket_auth_users"     = 'sum(hepza_socket_authenticated_users) or vector(0)'

    # VPS metrics (only available on Linux with node-exporter)
    "vps_cpu_percent"       = '100 * (1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m]))) or vector(0)'
    "vps_memory_percent"    = '100 * (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) or vector(0)'

    # Nginx metrics
    "nginx_connections"     = 'nginx_connections_active or vector(0)'
    "nginx_rps"             = 'rate(nginx_http_requests_total[1m]) or vector(0)'

    # BullMQ
    "bullmq_waiting"        = 'sum(hepza_bullmq_jobs{state="waiting"}) or vector(0)'
    "bullmq_active"         = 'sum(hepza_bullmq_jobs{state="active"}) or vector(0)'
    "bullmq_failed"         = 'sum(hepza_bullmq_jobs{state="failed"}) or vector(0)'

    # MongoDB Pool
    "mongodb_pool_size"      = 'hepza_mongodb_pool_size or vector(0)'
    "mongodb_pool_active"    = 'hepza_mongodb_pool_active or vector(0)'
    "mongodb_pool_available" = 'hepza_mongodb_pool_available or vector(0)'
    "mongodb_pool_pending"   = 'hepza_mongodb_pool_pending or vector(0)'
}

$metricsResult = @{}

foreach ($metric in $promQueries.GetEnumerator()) {
    try {
        $encoded = [System.Uri]::EscapeDataString($metric.Value)
        $response = Invoke-RestMethod -Uri "$PrometheusUrl/api/v1/query?query=$encoded" -Method Get
        $value = if ($response.data.result.Count -gt 0) { $response.data.result[0].value[1] } else { "N/A" }
        $metricsResult[$metric.Key] = $value
    } catch {
        $metricsResult[$metric.Key] = "query_failed"
    }
}

# Also get range data for HTTP latency over the test window (for peak detection)
$rangeQueries = @{
    "http_latency_p95_range" = 'histogram_quantile(0.95, sum by (le) (rate(hepza_http_request_duration_seconds_bucket{route!="/api/metrics"}[1m])))'
    "http_rps_range"         = 'sum(rate(hepza_http_requests_total{route!="/api/metrics"}[1m]))'
}

$rangeResults = @{}
foreach ($rq in $rangeQueries.GetEnumerator()) {
    try {
        $encoded = [System.Uri]::EscapeDataString($rq.Value)
        $step = "15s"
        $response = Invoke-RestMethod -Uri "$PrometheusUrl/api/v1/query_range?query=$encoded&start=$([Math]::Floor($from/1000))&end=$([Math]::Floor($to/1000))&step=$step" -Method Get
        if ($response.data.result.Count -gt 0) {
            $values = $response.data.result[0].values | ForEach-Object { [double]$_[1] } | Where-Object { -not [double]::IsNaN($_) }
            $rangeResults[$rq.Key] = @{
                max = ($values | Measure-Object -Maximum).Maximum
                min = ($values | Measure-Object -Minimum).Minimum
                avg = ($values | Measure-Object -Average).Average
                points = $values.Count
            }
        }
    } catch {
        $rangeResults[$rq.Key] = @{ error = $_.Exception.Message }
    }
}

# Save raw metrics JSON
$allMetrics = @{
    timestamp       = $now.ToString("o")
    lookback_minutes = $LookbackMinutes
    instant_metrics  = $metricsResult
    range_metrics    = $rangeResults
}
$allMetrics | ConvertTo-Json -Depth 10 | Out-File -FilePath (Join-Path $evidenceDir "prometheus-metrics.json") -Encoding UTF8

Write-Host "  Collected $($metricsResult.Count) instant metrics + $($rangeResults.Count) range metrics" -ForegroundColor Green

# ── Step 3: Generate Evidence Report ──
Write-Host "`n[3/3] Generating evidence report..." -ForegroundColor Yellow

$formatBytes = { param($b) if ($b -eq "N/A" -or $b -eq "query_failed") { $b } else { "{0:N1} MB" -f ([double]$b / 1048576) } }
$formatPercent = { param($v) if ($v -eq "N/A" -or $v -eq "query_failed") { $v } else { "{0:N1}%" -f [double]$v } }
$formatMs = { param($v) if ($v -eq "N/A" -or $v -eq "query_failed") { $v } else { "{0:N1} ms" -f ([double]$v * 1000) } }
$formatNum = { param($v) if ($v -eq "N/A" -or $v -eq "query_failed") { $v } else { "{0:N2}" -f [double]$v } }

$report = @"
# Benchmark Evidence Report
**Generated:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
**Time Window:** Last $LookbackMinutes minutes

## Grafana Dashboard Snapshot
- **Snapshot URL:** $snapshotUrl
- Open this URL in your browser to see the full interactive dashboard at the time of testing.

## Server Metrics at Test Completion

### HTTP Performance
| Metric | Value |
|--------|-------|
| Request Rate (RPS) | $(& $formatNum $metricsResult['http_rps']) req/s |
| Latency p95 | $(& $formatMs $metricsResult['http_latency_p95_sec']) |
| Latency p99 | $(& $formatMs $metricsResult['http_latency_p99_sec']) |
| 5xx Error Rate | $(& $formatNum $metricsResult['http_error_5xx_rate']) /s |
| 429 Rate-Limited | $(& $formatNum $metricsResult['http_429_rate']) /s |
| In-Flight Requests | $($metricsResult['http_in_flight']) |

### Server Resources
| Metric | Value |
|--------|-------|
| VPS CPU | $(& $formatPercent $metricsResult['vps_cpu_percent']) |
| VPS Memory | $(& $formatPercent $metricsResult['vps_memory_percent']) |
| API Process RSS | $(& $formatBytes $metricsResult['api_memory_rss_bytes']) |
| API Heap Used | $(& $formatBytes $metricsResult['api_heap_bytes']) |
| Event Loop Lag | $(& $formatMs $metricsResult['api_event_loop_lag_s']) |

### Redis
| Metric | Value |
|--------|-------|
| Memory Used | $(& $formatBytes $metricsResult['redis_memory_bytes']) |
| Connected Clients | $($metricsResult['redis_clients']) |
| Commands/sec | $(& $formatNum $metricsResult['redis_commands_per_sec']) |

### Cache
| Metric | Value |
|--------|-------|
| Cache Hits/sec | $(& $formatNum $metricsResult['cache_hits_per_sec']) |
| Cache Misses/sec | $(& $formatNum $metricsResult['cache_misses_per_sec']) |

### MongoDB Pool
| Metric | Value |
|--------|-------|
| Pool Size | $($metricsResult['mongodb_pool_size']) |
| Active Connections | $($metricsResult['mongodb_pool_active']) |
| Available Connections | $($metricsResult['mongodb_pool_available']) |
| Pending Requests | $($metricsResult['mongodb_pool_pending']) |

### Nginx
| Metric | Value |
|--------|-------|
| Active Connections | $($metricsResult['nginx_connections']) |
| Nginx RPS | $(& $formatNum $metricsResult['nginx_rps']) req/s |

### Socket & Queue
| Metric | Value |
|--------|-------|
| Socket Connections | $($metricsResult['socket_connections']) |
| Auth Users | $($metricsResult['socket_auth_users']) |
| BullMQ Waiting | $($metricsResult['bullmq_waiting']) |
| BullMQ Active | $($metricsResult['bullmq_active']) |
| BullMQ Failed | $($metricsResult['bullmq_failed']) |

### Peak Values During Test Window
| Metric | Peak | Avg | Min |
|--------|------|-----|-----|
| HTTP RPS | $(if ($rangeResults['http_rps_range'].max) { "{0:N2}" -f $rangeResults['http_rps_range'].max } else { "N/A" }) | $(if ($rangeResults['http_rps_range'].avg) { "{0:N2}" -f $rangeResults['http_rps_range'].avg } else { "N/A" }) | $(if ($rangeResults['http_rps_range'].min) { "{0:N2}" -f $rangeResults['http_rps_range'].min } else { "N/A" }) |
| Latency p95 | $(if ($rangeResults['http_latency_p95_range'].max) { "{0:N1} ms" -f ($rangeResults['http_latency_p95_range'].max * 1000) } else { "N/A" }) | $(if ($rangeResults['http_latency_p95_range'].avg) { "{0:N1} ms" -f ($rangeResults['http_latency_p95_range'].avg * 1000) } else { "N/A" }) | $(if ($rangeResults['http_latency_p95_range'].min) { "{0:N1} ms" -f ($rangeResults['http_latency_p95_range'].min * 1000) } else { "N/A" }) |
"@

$report | Out-File -FilePath (Join-Path $evidenceDir "evidence-report.md") -Encoding UTF8

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Evidence captured successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Report:     $evidenceDir\evidence-report.md"
Write-Host "  Metrics:    $evidenceDir\prometheus-metrics.json"
Write-Host "  Snapshot:   $evidenceDir\grafana-snapshot.json"
if ($snapshotUrl -ne "N/A (Grafana not reachable)") {
    Write-Host "  Dashboard:  $snapshotUrl" -ForegroundColor Green
}
Write-Host "========================================" -ForegroundColor Cyan
