# Performance Toolkit

This folder contains the production-safe performance toolkit for HEPZA:

- `k6/http-main-flows.js`: primary concurrent-user and core journey capacity test
- `k6/http-export-download.js`: optional heavy export download test
- `k6/socket-connect.js`: Socket.IO presence and connection ceiling test
- `artillery/http-main-flow.yml`: secondary authenticated HTTP baseline
- `scripts/run-k6.sh`: Docker-based k6 runner with HTML dashboard export
- `scripts/run-artillery.sh`: Docker-based Artillery runner with JSON + HTML report
- `scripts/create-capacity-memo.sh`: creates a memo template for final conclusions

## User Pool

Copy `perf/data/users.example.csv` to `perf/data/users.local.csv` and replace the placeholders with real test accounts.

If you do not already have enough unique accounts, seed a deterministic load-test pool first:

```bash
./perf/scripts/prepare-user-pool.sh
```

On Windows PowerShell:

```powershell
.\perf\scripts\prepare-user-pool.ps1
```

The script creates matching zones, companies, and users directly in DB, then writes `perf/data/users.local.csv` for the k6 runners.

Important for security-focused environments:

- Do not use `/api/users/create-account` for performance pool setup.
- The test wrapper above does not call user-service email flows, so it does not send password emails.

To scale the pool, override the default flow counts with `PERF_FLOW_COUNTS_JSON`. For example, to prepare a 2000-user HTTP pool:

```bash
PERF_FLOW_COUNTS_JSON='{"company_dashboard":1100,"company_history":300,"notification_reader":200,"export_light":150,"export_download":100,"manager_monitor":80,"admin_overview":70,"socket_presence":200}' \
./perf/scripts/prepare-user-pool.sh
```

PowerShell equivalent:

```powershell
$env:PERF_FLOW_COUNTS_JSON='{"company_dashboard":1100,"company_history":300,"notification_reader":200,"export_light":150,"export_download":100,"manager_monitor":80,"admin_overview":70,"socket_presence":200}'; .\perf\scripts\prepare-user-pool.ps1
```

Cleanup is available when you want to remove the synthetic pool:

```bash
./perf/scripts/prepare-user-pool.sh --cleanup
```

PowerShell cleanup:

```powershell
.\perf\scripts\prepare-user-pool.ps1 --cleanup
```

## Post-Test Cleanup (Required)

After each throughput/latency campaign, always clear the synthetic test users right away:

```powershell
.\perf\scripts\prepare-user-pool.ps1 --cleanup
```

If you are running from bash:

```bash
./perf/scripts/prepare-user-pool.sh --cleanup
```

Important:

- Each concurrent VU needs a unique test account.
- HEPZA invalidates older sessions when the same account logs in again.
- For a 1000-user run, prepare at least 1000 rows for the flow you plan to execute.

Recommended flow values:

- `company_dashboard`
- `company_history`
- `notification_reader`
- `export_light`
- `export_download`
- `manager_monitor`
- `admin_overview`
- `socket_presence`

## Quick Start

```bash
cp perf/data/users.example.csv perf/data/users.local.csv
chmod +x perf/scripts/*.sh

BASE_URL=https://api2.hepza.click \
TARGET_CONCURRENT_USERS=200 \
K6_WEB_DASHBOARD_PORT=5665 \
./perf/scripts/run-k6.sh http-main-flows.js

BASE_URL=https://api2.hepza.click \
TARGET_SOCKET_USERS=300 \
./perf/scripts/run-k6.sh socket-connect.js

BASE_URL=https://api2.hepza.click \
ARTILLERY_TARGET_RATE=20 \
./perf/scripts/run-artillery.sh http-main-flow.yml
```

Artifacts are written to:

- `perf/results/k6/<timestamp>/`
- `perf/results/artillery/<timestamp>/`
- `perf/results/capacity/<timestamp>/`
