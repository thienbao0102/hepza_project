<#
.SYNOPSIS
Runs the HEPZA-SDMS production benchmark with monitoring and auto evidence capture.

.DESCRIPTION
Full 5-step workflow:
1. Verify monitoring stack is running on production VPS
2. Seed test users (if needed)
3. Run K6 load test (100→500→1000→2000 VUs)
4. Auto-capture Grafana snapshot + Prometheus metrics
5. Generate evidence report

.EXAMPLE
.\run-prod-benchmark.ps1 -TargetVUs 2048 -BaseUrl "https://api2.hepza.click"
.\run-prod-benchmark.ps1 -TargetVUs 500 -BaseUrl "https://api2.hepza.click" -GrafanaUrl "http://localhost:3002"
#>
param (
    [string]$BaseUrl = "https://api2.hepza.click",
    [int]$TargetVUs = 2048,

    # Grafana/Prometheus URLs — use SSH tunnel or direct VPS access
    [string]$GrafanaUrl = "http://localhost:3002",
    [string]$PrometheusUrl = "http://localhost:9090",

    # Skip seeding users (if already seeded)
    [switch]$SkipSeed,

    # Skip monitoring evidence capture
    [switch]$SkipMonitoring
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Resolve-Path (Join-Path $scriptDir "../..")
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$resultsDir = Join-Path $rootDir "perf/results/prod-benchmark/$timestamp"
New-Item -ItemType Directory -Force -Path $resultsDir | Out-Null

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "HEPZA Production Benchmark" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Target VUs:   $TargetVUs"
Write-Host "Base URL:     $BaseUrl"
Write-Host "Grafana:      $GrafanaUrl"
Write-Host "Prometheus:   $PrometheusUrl"
Write-Host "Output:       $resultsDir"
Write-Host "========================================" -ForegroundColor Cyan

# ── Step 1: Verify monitoring stack ──
if (-not $SkipMonitoring) {
    Write-Host "`n[1/5] Verifying monitoring stack..." -ForegroundColor Yellow
    try {
        $promCheck = Invoke-RestMethod -Uri "$PrometheusUrl/api/v1/status/config" -Method Get -TimeoutSec 5 -ErrorAction Stop
        Write-Host "  Prometheus: OK" -ForegroundColor Green
    } catch {
        Write-Host "  Prometheus not reachable at $PrometheusUrl" -ForegroundColor Red
        Write-Host "  TIP: SSH tunnel: ssh -L 9090:127.0.0.1:9090 -L 3002:127.0.0.1:3002 user@vps" -ForegroundColor DarkGray
        Write-Host "  Or start monitoring: docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d" -ForegroundColor DarkGray
        throw "Monitoring stack not reachable. Start it or use -SkipMonitoring."
    }
    try {
        $grafCheck = Invoke-RestMethod -Uri "$GrafanaUrl/api/health" -Method Get -TimeoutSec 5 -ErrorAction Stop
        Write-Host "  Grafana:    OK" -ForegroundColor Green
    } catch {
        Write-Host "  Warning: Grafana not reachable — evidence capture will skip snapshot" -ForegroundColor DarkYellow
    }
} else {
    Write-Host "`n[1/5] Skipping monitoring check (--SkipMonitoring)" -ForegroundColor DarkGray
}

# ── Step 2: Seed test users ──
if (-not $SkipSeed) {
    Write-Host "`n[2/5] Seeding $TargetVUs test users..." -ForegroundColor Yellow

    # Distribute users across 8 flows proportionally
    $dashboard     = [Math]::Floor($TargetVUs * 0.25)
    $history       = [Math]::Floor($TargetVUs * 0.10)
    $declaration   = [Math]::Floor($TargetVUs * 0.15)
    $declHistory   = [Math]::Floor($TargetVUs * 0.10)
    $notification  = [Math]::Floor($TargetVUs * 0.10)
    $exportLight   = [Math]::Floor($TargetVUs * 0.05)
    $manager       = [Math]::Floor($TargetVUs * 0.10)
    $admin         = [Math]::Floor($TargetVUs * 0.05)
    $remaining     = $TargetVUs - ($dashboard + $history + $declaration + $declHistory + $notification + $exportLight + $manager + $admin)
    $dashboard    += $remaining  # Put remaining into dashboard

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
    Write-Host "`n[2/5] Skipping user seeding (--SkipSeed)" -ForegroundColor DarkGray
}

# ── Step 3: Run K6 benchmark ──
Write-Host "`n[3/5] Running K6 benchmark (ramp 100 → $TargetVUs VUs)..." -ForegroundColor Yellow
Write-Host "  Estimated duration: ~28 minutes" -ForegroundColor DarkGray

$perfVolume = "$($rootDir.Path.Replace('\', '/'))/perf"

$k6Args = @(
    "run",
    "--rm",
    "-i",
    "-e", "BASE_URL=$BaseUrl",
    "-e", "TARGET_CONCURRENT_USERS=$TargetVUs",
    "-e", "TARGET_VUS=$TargetVUs",
    "-e", "USER_CSV=../../data/users.prod.csv",
    "-v", "${perfVolume}:/perf",
    "grafana/k6:0.49.0",
    "run",
    "--summary-export", "/perf/results/prod-benchmark/$timestamp/summary.json",
    "/perf/k6/prod-benchmark.js"
)

$k6Process = Start-Process -FilePath "docker" -ArgumentList $k6Args -NoNewWindow -Wait -PassThru

if ($k6Process.ExitCode -ne 0) {
    Write-Host "  K6 exited with code $($k6Process.ExitCode)" -ForegroundColor DarkYellow
}

# ── Step 4: Auto-capture evidence ──
if (-not $SkipMonitoring) {
    Write-Host "`n[4/5] Auto-capturing benchmark evidence..." -ForegroundColor Yellow
    try {
        & "$scriptDir\capture-benchmark-evidence.ps1" `
            -ResultsDir $resultsDir `
            -GrafanaUrl $GrafanaUrl `
            -PrometheusUrl $PrometheusUrl `
            -LookbackMinutes 35
    } catch {
        Write-Host "  Warning: Evidence capture failed: $_" -ForegroundColor DarkYellow
    }
} else {
    Write-Host "`n[4/5] Skipping evidence capture (--SkipMonitoring)" -ForegroundColor DarkGray
}

# ── Step 5: Summary ──
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "[5/5] Production Benchmark Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "K6 Results:     $resultsDir\summary.json"
if (-not $SkipMonitoring) {
    Write-Host "Evidence:       $resultsDir\evidence\evidence-report.md"
    Write-Host "Grafana Live:   $GrafanaUrl/d/hepza-overview"
}
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Open evidence-report.md for server-side metrics"
Write-Host "  2. Open Grafana to review dashboard graphs"
Write-Host "  3. Check summary.json for K6 client-side metrics"
Write-Host "========================================" -ForegroundColor Cyan
