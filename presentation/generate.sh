#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE_URL="${1:-http://127.0.0.1:3000}"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT="$ROOT/presentation/assets/screens"

if [[ ! -x "$CHROME" ]]; then
  echo "Chrome not found at: $CHROME" >&2
  exit 1
fi

mkdir -p "$OUT"

if ! curl -sf "$BASE_URL" >/dev/null; then
  echo "Local site is not reachable at $BASE_URL" >&2
  echo "Start the app first, for example: npm run dev -- --hostname 127.0.0.1 --port 3000" >&2
  exit 1
fi

capture_url() {
  local name="$1"
  local url="$2"
  capture_with_chrome "$OUT/$name" 1600,2200 12000 "$url"
}

capture_file() {
  local name="$1"
  local path="$2"
  capture_with_chrome "$OUT/$name" 1600,1200 3000 "file://$path" --allow-file-access-from-files
}

capture_with_chrome() {
  local output="$1"
  local size="$2"
  local budget="$3"
  local target="$4"
  shift 4

  local profile
  local chrome_pid
  local waited=0
  profile="$(mktemp -d /tmp/panavest-chrome-XXXXXX)"
  rm -f "$output"

  "$CHROME" \
    --headless \
    --disable-gpu \
    --disable-background-networking \
    --no-first-run \
    --no-default-browser-check \
    --hide-scrollbars \
    --run-all-compositor-stages-before-draw \
    --virtual-time-budget="$budget" \
    --window-size="$size" \
    --user-data-dir="$profile" \
    --screenshot="$output" \
    "$@" \
    "$target" >/dev/null 2>&1 &
  chrome_pid=$!

  while [[ $waited -lt 40 ]]; do
    if [[ -s "$output" ]]; then
      break
    fi
    if ! kill -0 "$chrome_pid" 2>/dev/null; then
      break
    fi
    sleep 1
    waited=$((waited + 1))
  done

  if kill -0 "$chrome_pid" 2>/dev/null; then
    kill "$chrome_pid" 2>/dev/null || true
    sleep 1
    kill -9 "$chrome_pid" 2>/dev/null || true
  fi

  wait "$chrome_pid" 2>/dev/null || true
  rm -rf "$profile"

  if [[ ! -s "$output" ]]; then
    echo "Capture failed: $output" >&2
    exit 1
  fi

  echo "Captured $(basename "$output")"
}

capture_url "home.png" "$BASE_URL"
capture_url "sign-in.png" "$BASE_URL/auth/sign-in"
capture_url "sign-up.png" "$BASE_URL/auth/sign-up"
capture_url "knowledge.png" "$BASE_URL/knowledge"
capture_url "course-detail.png" "$BASE_URL/knowledge/ghie-business-ethics"
capture_url "ebooks.png" "$BASE_URL/ebooks"
capture_url "ebook-detail.png" "$BASE_URL/ebooks/SingleSoleBook"

capture_file "mock-payment.png" "$ROOT/presentation/assets/mock/payment.html"
capture_file "mock-dashboard.png" "$ROOT/presentation/assets/mock/dashboard.html"
capture_file "mock-certificate.png" "$ROOT/presentation/assets/mock/certificate.html"

echo "Screenshots generated in $OUT"
