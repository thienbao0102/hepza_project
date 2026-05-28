Param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$ArgsFromCaller
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Resolve-Path (Join-Path $scriptDir "../..")
$seedScript = Join-Path $rootDir "ServerSide/scripts/seedPerformanceUsers.js"

Write-Host "Preparing performance user pool via direct DB seeding..."
Write-Host "No /api/users/create-account call is made, so password emails are not sent."

& node $seedScript @ArgsFromCaller

Write-Host "Done. User pool CSV is ready for k6 at perf/data/users.local.csv"
