#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT_PATH="${1:-http-main-flows.js}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUTPUT_DIR="$ROOT_DIR/perf/results/k6/$TIMESTAMP"

if [[ -z "${BASE_URL:-}" ]]; then
  echo "BASE_URL is required. Example: BASE_URL=https://api2.hepza.click"
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

docker run --rm -i \
  -p "${K6_WEB_DASHBOARD_PORT:-5665}:${K6_WEB_DASHBOARD_PORT:-5665}" \
  -e BASE_URL \
  -e TARGET_CONCURRENT_USERS="${TARGET_CONCURRENT_USERS:-100}" \
  -e TARGET_EXPORT_USERS="${TARGET_EXPORT_USERS:-10}" \
  -e TARGET_SOCKET_USERS="${TARGET_SOCKET_USERS:-200}" \
  -e PERIOD_START="${PERIOD_START:-}" \
  -e PERIOD_END="${PERIOD_END:-}" \
  -e RAMP_UP_SECONDS="${RAMP_UP_SECONDS:-300}" \
  -e HOLD_SECONDS="${HOLD_SECONDS:-900}" \
  -e RAMP_DOWN_SECONDS="${RAMP_DOWN_SECONDS:-180}" \
  -e K6_WEB_DASHBOARD=true \
  -e K6_WEB_DASHBOARD_PORT="${K6_WEB_DASHBOARD_PORT:-5665}" \
  -e "K6_WEB_DASHBOARD_EXPORT=/perf/results/k6/$TIMESTAMP/dashboard.html" \
  -v "$ROOT_DIR/perf:/perf" \
  grafana/k6:0.49.0 run \
  --summary-export "/perf/results/k6/$TIMESTAMP/summary.json" \
  "/perf/k6/$SCRIPT_PATH" | tee "$OUTPUT_DIR/console.txt"

echo "k6 artifacts written to $OUTPUT_DIR"
