#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCENARIO_PATH="${1:-http-main-flow.yml}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUTPUT_DIR="$ROOT_DIR/perf/results/artillery/$TIMESTAMP"

if [[ -z "${BASE_URL:-}" ]]; then
  echo "BASE_URL is required. Example: BASE_URL=https://api2.hepza.click"
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

docker run --rm -i \
  -e BASE_URL \
  -e PERIOD_START="${PERIOD_START:-}" \
  -e PERIOD_END="${PERIOD_END:-}" \
  -e ARTILLERY_RAMP_SECONDS="${ARTILLERY_RAMP_SECONDS:-300}" \
  -e ARTILLERY_HOLD_SECONDS="${ARTILLERY_HOLD_SECONDS:-900}" \
  -e ARTILLERY_START_RATE="${ARTILLERY_START_RATE:-1}" \
  -e ARTILLERY_TARGET_RATE="${ARTILLERY_TARGET_RATE:-20}" \
  -v "$ROOT_DIR/perf:/perf" \
  -w /perf/artillery \
  artilleryio/artillery:latest run "$SCENARIO_PATH" -o "/perf/results/artillery/$TIMESTAMP/report.json" \
  | tee "$OUTPUT_DIR/console.txt"

docker run --rm -i \
  -v "$ROOT_DIR/perf:/perf" \
  -w /perf/artillery \
  artilleryio/artillery:latest report "/perf/results/artillery/$TIMESTAMP/report.json" -o "/perf/results/artillery/$TIMESTAMP/report.html"

echo "Artillery artifacts written to $OUTPUT_DIR"
