#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TIMESTAMP="${1:-$(date +%Y%m%d-%H%M%S)}"
OUTPUT_DIR="$ROOT_DIR/perf/results/capacity/$TIMESTAMP"

mkdir -p "$OUTPUT_DIR"
cp "$ROOT_DIR/perf/templates/capacity-memo-template.md" "$OUTPUT_DIR/capacity-memo.md"

echo "Capacity memo template created at $OUTPUT_DIR/capacity-memo.md"
