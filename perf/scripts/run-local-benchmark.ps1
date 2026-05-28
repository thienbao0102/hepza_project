<#
.SYNOPSIS
Runs the HEPZA-SDMS local performance benchmark with integrated monitoring.

.DESCRIPTION
Automates:
1. Starting/restarting backend with correct RATELIMIT_MULTIPLIER
2. Starting Prometheus + Grafana monitoring stack
3. Running k6 load test inside the Docker network
4. Providing Grafana dashboard URL for live server metrics

.EXAMPLE
.\run-local-benchmark.ps1 -Mode capacity
.\run-local-benchmark.ps1 -Mode ratelimit
#>
param(
    [ValidateSet("capacity", "ratelimit")]
    [string]$Mode = "capacity",

    [switch]$SkipMonitoring
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Resolve-Path (Join-Path $scriptDir "../..")
$timestamp = (Get-Date).ToString("yyyyMMdd-HHmmss")
$outputDir = Join-Path $rootDir "perf/results/local-benchmark/$timestamp"

New-Item -ItemType Directory -Force -Path $outputDir > $null

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "HEPZA Local Benchmark" -ForegroundColor Cyan
Write-Host "Mode:       $Mode"
Write-Host "Monitoring: $(-not $SkipMonitoring)"
Write-Host "Output:     $outputDir"
Write-Host "========================================" -ForegroundColor Cyan

# ── Step 1: Configure and restart backend with correct rate limit ──
if ($Mode -eq "capacity") {
    Write-Host "`n[1/4] Restarting backend with RATELIMIT_MULTIPLIER=100 (Capacity mode)..." -ForegroundColor Yellow
    $env:RATELIMIT_MULTIPLIER = 100
} else {
    Write-Host "`n[1/4] Restarting backend with RATELIMIT_MULTIPLIER=1 (Ratelimit mode)..." -ForegroundColor Yellow
    $env:RATELIMIT_MULTIPLIER = 1
}
docker compose -f docker-compose.local.yml up -d backend
Start-Sleep -Seconds 5

# ── Step 2: Start monitoring stack (Prometheus + Grafana + Redis Exporter) ──
if (-not $SkipMonitoring) {
    Write-Host "`n[2/4] Starting monitoring stack (Prometheus + Grafana)..." -ForegroundColor Yellow
    docker compose -f docker-compose.local.yml -f docker-compose.local-monitoring.yml up -d prometheus grafana redis-exporter 2>&1 | Out-Null
    Start-Sleep -Seconds 3
    Write-Host "  Grafana dashboard: http://localhost:3001  (admin/admin)" -ForegroundColor Green
    Write-Host "  Prometheus UI:     http://localhost:9090" -ForegroundColor Green
} else {
    Write-Host "`n[2/4] Skipping monitoring (--SkipMonitoring flag)" -ForegroundColor DarkGray
}

# ── Step 3: Run k6 inside same Docker network ──
Write-Host "`n[3/4] Running k6 benchmark..." -ForegroundColor Yellow

$networkName = "project_hepza_hepza-local-network"

$k6Args = @(
    "run",
    "--rm",
    "-i",
    "--network", $networkName,
    "-e", "BASE_URL=http://backend:5000",
    "-e", "TARGET_CONCURRENT_USERS=20",
    "-e", "TARGET_VUS=20",
    "-e", "BENCHMARK_MODE=$Mode",
    "-v", "$($rootDir.Path.Replace('\', '/'))/perf:/perf",
    "grafana/k6:0.49.0",
    "run",
    "--summary-export", "/perf/results/local-benchmark/$timestamp/summary.json",
    "/perf/k6/local-benchmark.js"
)

$process = Start-Process -FilePath "docker" -ArgumentList $k6Args -NoNewWindow -Wait -PassThru

# ── Step 4: Auto-capture evidence (Grafana snapshot + Prometheus metrics) ──
if (-not $SkipMonitoring) {
    Write-Host "`n[4/5] Auto-capturing benchmark evidence..." -ForegroundColor Yellow
    try {
        & "$scriptDir\capture-benchmark-evidence.ps1" -ResultsDir $outputDir -LookbackMinutes 10
    } catch {
        Write-Host "  Warning: Evidence capture failed: $_" -ForegroundColor DarkYellow
    }
}

# ── Step 5: Summary ──
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "[5/5] Benchmark Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "K6 Results:       $outputDir\summary.json"
if (-not $SkipMonitoring) {
    Write-Host "Evidence Report:  $outputDir\evidence\evidence-report.md"
    Write-Host "Grafana Dashboard: http://localhost:3001"
    Write-Host ""
    Write-Host "TIP: Monitoring stack is still running. To stop:" -ForegroundColor DarkGray
    Write-Host "  docker compose -f docker-compose.local.yml -f docker-compose.local-monitoring.yml down" -ForegroundColor DarkGray
}
Write-Host "========================================" -ForegroundColor Cyan

