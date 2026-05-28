#!/usr/bin/env bash
set -Eeuo pipefail
set +x

REPORT_ONLY="${SECURITY_REPORT_ONLY:-true}"
TARGET_URL="${ZAP_TARGET_URL:-https://api2.hepza.click}"
STAGING_CONFIRMED="${ZAP_STAGING_CONFIRMED:-false}"
ALLOW_CUSTOM_TARGET="${ZAP_ALLOW_CUSTOM_TARGET:-false}"
INCLUDE_MUTATIONS="${ZAP_INCLUDE_MUTATIONS:-false}"
EXPECTED_ROLE="${ZAP_EXPECTED_ROLE:-company}"
EXPECTED_USER_ID="${ZAP_EXPECTED_USER_ID:-}"
AUTH_EMAIL="${ZAP_AUTH_EMAIL:-}"
AUTH_PASSWORD="${ZAP_AUTH_PASSWORD:-}"
ZAP_DOCKER_TIMEOUT_SECONDS="${ZAP_DOCKER_TIMEOUT_SECONDS:-900}"
ZAP_MAX_SCAN_MINUTES="${ZAP_MAX_SCAN_MINUTES:-10}"
ZAP_PASSIVE_WAIT_SECONDS="${ZAP_PASSIVE_WAIT_SECONDS:-120}"
ZAP_RATE_LIMIT_RPS="${ZAP_RATE_LIMIT_RPS:-2}"
ZAP_ACTIVE_DELAY_MS="${ZAP_ACTIVE_DELAY_MS:-500}"
ZAP_ACTIVE_THREADS_PER_HOST="${ZAP_ACTIVE_THREADS_PER_HOST:-1}"

RAW_REPORT_DIR="security-reports/zap/raw"
SANITIZED_REPORT_DIR="security-reports/sanitized/zap"
TMP_DIR=".security-tmp/zap"
SUMMARY_FILE="$RAW_REPORT_DIR/zap-summary.md"

mkdir -p "$RAW_REPORT_DIR" "$SANITIZED_REPORT_DIR" "$TMP_DIR"
chmod 700 "$TMP_DIR" || true

COOKIE_JAR="$TMP_DIR/cookie-jar.txt"
LOGIN_RESPONSE="$TMP_DIR/auth-response.json"
ME_RESPONSE="$TMP_DIR/me-response.json"
OPENAPI_RAW="$TMP_DIR/openapi-raw.json"
OPENAPI_FILTERED="$TMP_DIR/openapi-filtered.json"
IDENTITY_VALIDATION_NOTE=""

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

mask_value() {
  local value="${1:-}"
  if [ -n "$value" ]; then
    echo "::add-mask::$value"
  fi
}

record_summary() {
  local status="$1"
  local detail="$2"
  cat > "$SUMMARY_FILE" <<EOF
# OWASP ZAP DAST Summary

- Status: $status
- Target: $(node -e "const u=new URL(process.argv[1]); console.log(u.origin)" "$TARGET_URL" 2>/dev/null || echo '[invalid target]')
- Branch gate: Deploy Hepza workflow_run on test only
- Mutations included: $INCLUDE_MUTATIONS
- Rate limit: ${ZAP_RATE_LIMIT_RPS} request(s)/second
- Active scan threads per host: $ZAP_ACTIVE_THREADS_PER_HOST
- Active scan delay: ${ZAP_ACTIVE_DELAY_MS}ms
- Max scan duration: ${ZAP_MAX_SCAN_MINUTES} minute(s)
- Detail: $detail
EOF
}

safe_exit() {
  local code="$1"
  local status="$2"
  local detail="$3"
  record_summary "$status" "$detail"
  REDACT_VALUES="$AUTH_EMAIL,$TARGET_URL" node scripts/security/redact-security-artifacts.js \
    --input security-reports \
    --output security-reports/sanitized || true

  if [ "$REPORT_ONLY" = "true" ]; then
    exit 0
  fi
  exit "$code"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    safe_exit 2 "skipped" "Required command '$1' is not available."
  fi
}

mask_value "$AUTH_EMAIL"
mask_value "$AUTH_PASSWORD"
mask_value "$TARGET_URL"

require_command curl
require_command node
require_command docker

TARGET_HOST="$(node -e "try { console.log(new URL(process.argv[1]).hostname) } catch { process.exit(1) }" "$TARGET_URL" 2>/dev/null || true)"
if [ -z "$TARGET_HOST" ]; then
  safe_exit 2 "skipped" "ZAP_TARGET_URL is not a valid URL."
fi

if [ "$ALLOW_CUSTOM_TARGET" != "true" ] && [ "$TARGET_HOST" != "api2.hepza.click" ]; then
  safe_exit 2 "skipped" "Refusing to scan non-staging host '$TARGET_HOST' without ZAP_ALLOW_CUSTOM_TARGET=true."
fi

if [ "$STAGING_CONFIRMED" != "true" ]; then
  safe_exit 0 "skipped" "ZAP_STAGING_CONFIRMED is not true; staging isolation must be confirmed before automated scanning."
fi

if [ -z "$AUTH_EMAIL" ] || [ -z "$AUTH_PASSWORD" ]; then
  safe_exit 2 "skipped" "ZAP_AUTH_EMAIL and ZAP_AUTH_PASSWORD must be configured as secrets."
fi

wait_for_endpoint() {
  local label="$1"
  local url="$2"
  local attempts="${3:-6}"
  local sleep_seconds="${4:-10}"
  local status="000"

  for attempt in $(seq 1 "$attempts"); do
    status="$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 10 --max-time 20 "$url" || echo '000')"
    if [ "$status" = "200" ]; then
      echo "$label ready on attempt $attempt"
      return 0
    fi
    echo "$label not ready on attempt $attempt (HTTP $status); retrying..."
    sleep "$sleep_seconds"
  done

  safe_exit 2 "skipped" "$label did not become ready at $url after $attempts attempts. Last HTTP status: $status."
}

wait_for_endpoint "Health endpoint" "$TARGET_URL/api/health" 6 10
wait_for_endpoint "OpenAPI endpoint" "$TARGET_URL/api/docs.json" 6 10

login() {
  rm -f "$COOKIE_JAR" "$LOGIN_RESPONSE" "$ME_RESPONSE"
  local payload
  payload="$(node -e "console.log(JSON.stringify({ email: process.env.ZAP_AUTH_EMAIL, password: process.env.ZAP_AUTH_PASSWORD }))")"
  local status
  status="$(curl -sS \
    --connect-timeout 10 \
    --max-time 20 \
    -c "$COOKIE_JAR" \
    -H 'Content-Type: application/json' \
    -X POST \
    --data "$payload" \
    -o "$LOGIN_RESPONSE" \
    -w '%{http_code}' \
    "$TARGET_URL/api/auth/login" || echo '000')"

  if [ "$status" != "200" ]; then
    safe_exit 2 "skipped" "Login failed with HTTP $status."
  fi

  chmod 600 "$COOKIE_JAR" "$LOGIN_RESPONSE" || true
}

cookie_value() {
  local name="$1"
  awk -v wanted="$name" 'BEGIN { FS="\t" } $0 !~ /^#/ || $0 ~ /^#HttpOnly_/ { domain=$1; sub(/^#HttpOnly_/, "", domain); if ($6 == wanted) { value=$7 } } END { if (value != "") print value }' "$COOKIE_JAR"
}

build_cookie_header() {
  awk 'BEGIN { FS="\t" } $0 !~ /^#/ || $0 ~ /^#HttpOnly_/ { domain=$1; sub(/^#HttpOnly_/, "", domain); if (NF >= 7) { printf "%s%s=%s", sep, $6, $7; sep="; " } } END { print "" }' "$COOKIE_JAR"
}

validate_identity() {
  local cookie_header="$1"
  local csrf_token="$2"
  local retry_attempts="${3:-1}"
  local retry_delay_seconds="${4:-1}"
  local request_max_time="${5:-20}"
  local allow_rate_limited_inconclusive="${6:-false}"
  local attempt=1
  local current_delay="$retry_delay_seconds"
  local status
  local curl_headers=("-H" "Cookie: $cookie_header")
  if [ -n "$csrf_token" ]; then
    curl_headers+=("-H" "x-csrf-token: $csrf_token")
  fi

  while [ "$attempt" -le "$retry_attempts" ]; do
    status="$(curl -sS \
      --connect-timeout 10 \
      --max-time "$request_max_time" \
      -b "$COOKIE_JAR" \
      "${curl_headers[@]}" \
      -o "$ME_RESPONSE" \
      -w '%{http_code}' \
      "$TARGET_URL/api/auth/me" || echo '000')"

    if [ "$status" = "200" ]; then
      break
    fi

    if [ "$status" = "429" ] && [ "$attempt" -lt "$retry_attempts" ]; then
      echo "Authenticated session verification hit HTTP 429 (attempt $attempt/$retry_attempts); retrying in ${current_delay}s..."
      sleep "$current_delay"
      current_delay=$((current_delay * 2))
      attempt=$((attempt + 1))
      continue
    fi

    if [ "$status" = "429" ] && [ "$allow_rate_limited_inconclusive" = "true" ]; then
      IDENTITY_VALIDATION_NOTE="Post-scan auth verification remained rate-limited after ${retry_attempts} attempts (HTTP 429); session validity after scan is inconclusive."
      echo "$IDENTITY_VALIDATION_NOTE"
      return 0
    fi

    safe_exit 2 "skipped" "Authenticated session verification failed with HTTP $status."
  done

  if [ "$status" != "200" ]; then
    safe_exit 2 "skipped" "Authenticated session verification failed with HTTP $status."
  fi

  if ! node <<'NODE'
const fs = require('fs');
const responsePath = process.env.ME_RESPONSE;
const expectedEmail = process.env.ZAP_AUTH_EMAIL;
const expectedRole = process.env.ZAP_EXPECTED_ROLE || 'company';
const expectedUserId = process.env.ZAP_EXPECTED_USER_ID || '';
const data = JSON.parse(fs.readFileSync(responsePath, 'utf8'));
const user = data.user || data;
const failures = [];
if (!user || typeof user !== 'object') failures.push('missing user object');
if (user.email !== expectedEmail) failures.push('email mismatch');
if (user.role !== expectedRole) failures.push(`role mismatch: expected ${expectedRole}`);
if (user.role === 'admin') failures.push('admin account is not allowed for DAST');
if (user.firstLogin !== false) failures.push('firstLogin must be false');
if (expectedUserId && user.user_id !== expectedUserId) failures.push('user_id mismatch');
if (failures.length) {
  console.error(failures.join('; '));
  process.exit(1);
}
NODE
  then
    safe_exit 2 "skipped" "Authenticated identity validation failed."
  fi
}

export ME_RESPONSE
login
AUTH_COOKIE_HEADER="$(build_cookie_header)"
CSRF_TOKEN="$(cookie_value '__Secure-csrfToken')"
if [ -z "$CSRF_TOKEN" ]; then
  CSRF_TOKEN="$(cookie_value 'csrfToken')"
fi
AUTH_TOKEN="$(cookie_value '__Secure-authToken')"
if [ -z "$AUTH_TOKEN" ]; then
  AUTH_TOKEN="$(cookie_value 'authToken')"
fi
REFRESH_TOKEN="$(cookie_value '__Secure-refreshToken')"
if [ -z "$REFRESH_TOKEN" ]; then
  REFRESH_TOKEN="$(cookie_value 'refreshToken')"
fi

mask_value "$AUTH_COOKIE_HEADER"
mask_value "$CSRF_TOKEN"
mask_value "$AUTH_TOKEN"
mask_value "$REFRESH_TOKEN"

if [ -z "$AUTH_COOKIE_HEADER" ] || [ -z "$AUTH_TOKEN" ]; then
  safe_exit 2 "skipped" "Login did not produce an auth cookie."
fi

validate_identity "$AUTH_COOKIE_HEADER" "$CSRF_TOKEN"

curl -sS --connect-timeout 10 --max-time 20 "$TARGET_URL/api/docs.json" -o "$OPENAPI_RAW"
node scripts/security/filter-openapi-for-zap.js \
  --input "$OPENAPI_RAW" \
  --output "$OPENAPI_FILTERED" \
  --exclude security/zap/excluded-routes.json \
  --include-mutations "$INCLUDE_MUTATIONS" > "$RAW_REPORT_DIR/openapi-filter-stats.json"

# Re-authenticate immediately before the scan so the 15-minute JWT TTL covers the capped scan window.
login
AUTH_COOKIE_HEADER="$(build_cookie_header)"
CSRF_TOKEN="$(cookie_value '__Secure-csrfToken')"
if [ -z "$CSRF_TOKEN" ]; then
  CSRF_TOKEN="$(cookie_value 'csrfToken')"
fi
mask_value "$AUTH_COOKIE_HEADER"
mask_value "$CSRF_TOKEN"
validate_identity "$AUTH_COOKIE_HEADER" "$CSRF_TOKEN"

ZAP_EXIT=0
chmod 777 "$RAW_REPORT_DIR" || true
set +e
timeout "${ZAP_DOCKER_TIMEOUT_SECONDS}s" docker run --rm \
  -v "$PWD/$OPENAPI_FILTERED:/zap/wrk/openapi-filtered.json:ro" \
  -v "$PWD/security/zap/zap-api.conf:/zap/wrk/zap-api.conf:ro" \
  -v "$PWD/security/zap/zap-hooks.py:/zap/wrk/zap-hooks.py:ro" \
  -v "$PWD/$RAW_REPORT_DIR:/zap/wrk/reports" \
  -e ZAP_TARGET_URL="$TARGET_URL" \
  -e ZAP_AUTH_COOKIE_HEADER="$AUTH_COOKIE_HEADER" \
  -e ZAP_CSRF_TOKEN="$CSRF_TOKEN" \
  -e ZAP_RATE_LIMIT_RPS="$ZAP_RATE_LIMIT_RPS" \
  -e ZAP_ACTIVE_DELAY_MS="$ZAP_ACTIVE_DELAY_MS" \
  -e ZAP_ACTIVE_THREADS_PER_HOST="$ZAP_ACTIVE_THREADS_PER_HOST" \
  -e ZAP_MAX_SCAN_MINUTES="$ZAP_MAX_SCAN_MINUTES" \
  -e ZAP_PASSIVE_WAIT_SECONDS="$ZAP_PASSIVE_WAIT_SECONDS" \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-api-scan.py \
  -t /zap/wrk/openapi-filtered.json \
  -f openapi \
  -c /zap/wrk/zap-api.conf \
  -r reports/zap-report.html \
  -J reports/zap-report.json \
  -w reports/zap-report.md \
  -z "-addoninstall network -addoninstall replacer" \
  --hook=/zap/wrk/zap-hooks.py
ZAP_EXIT=$?
set -e

if [ -s "$RAW_REPORT_DIR/zap-report.json" ]; then
  node scripts/security/zap-json-to-sarif.js \
    --input "$RAW_REPORT_DIR/zap-report.json" \
    --output "$RAW_REPORT_DIR/zap-report.sarif" || true
fi

POST_ME_RESPONSE="$TMP_DIR/post-scan-me-response.json"
ME_RESPONSE="$POST_ME_RESPONSE"
export ME_RESPONSE
validate_identity "$AUTH_COOKIE_HEADER" "$CSRF_TOKEN" 4 1 10 true

if [ "$ZAP_EXIT" -eq 124 ]; then
  safe_exit 2 "timeout" "ZAP scan timed out after ${ZAP_DOCKER_TIMEOUT_SECONDS} seconds."
elif [ "$ZAP_EXIT" -ne 0 ]; then
  if [ -n "$IDENTITY_VALIDATION_NOTE" ]; then
    safe_exit "$ZAP_EXIT" "completed-with-findings" "ZAP exited with code $ZAP_EXIT. Report-only mode keeps CI non-blocking. $IDENTITY_VALIDATION_NOTE"
  fi
  safe_exit "$ZAP_EXIT" "completed-with-findings" "ZAP exited with code $ZAP_EXIT. Report-only mode keeps CI non-blocking."
fi

if [ -n "$IDENTITY_VALIDATION_NOTE" ]; then
  safe_exit 0 "completed" "ZAP completed successfully. $IDENTITY_VALIDATION_NOTE"
fi

safe_exit 0 "completed" "ZAP completed successfully."
