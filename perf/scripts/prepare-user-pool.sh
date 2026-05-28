#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "Preparing performance user pool via direct DB seeding..."
echo "No /api/users/create-account call is made, so password emails are not sent."

node "$ROOT_DIR/ServerSide/scripts/seedPerformanceUsers.js" "$@"

echo "Done. User pool CSV is ready for k6 at perf/data/users.local.csv"
