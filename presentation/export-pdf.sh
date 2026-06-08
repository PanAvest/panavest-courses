#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
HTML="$ROOT/presentation/panavest-kds-tour.html"
PDF="$ROOT/presentation/panavest-kds-tour.pdf"
PROFILE="$(mktemp -d /tmp/panavest-pdf-XXXXXX)"

cleanup() {
  rm -rf "$PROFILE"
}
trap cleanup EXIT

if [[ ! -x "$CHROME" ]]; then
  echo "Chrome not found at: $CHROME" >&2
  exit 1
fi

rm -f "$PDF"

"$CHROME" \
  --headless \
  --disable-gpu \
  --disable-background-networking \
  --no-first-run \
  --no-default-browser-check \
  --allow-file-access-from-files \
  --print-to-pdf="$PDF" \
  --no-pdf-header-footer \
  --run-all-compositor-stages-before-draw \
  --virtual-time-budget=3000 \
  --window-size=1440,900 \
  --user-data-dir="$PROFILE" \
  "file://$HTML" >/dev/null 2>&1 &

CHROME_PID=$!
WAITED=0

while [[ $WAITED -lt 40 ]]; do
  if [[ -s "$PDF" ]]; then
    break
  fi
  if ! kill -0 "$CHROME_PID" 2>/dev/null; then
    break
  fi
  sleep 1
  WAITED=$((WAITED + 1))
done

if kill -0 "$CHROME_PID" 2>/dev/null; then
  kill "$CHROME_PID" 2>/dev/null || true
  sleep 1
  kill -9 "$CHROME_PID" 2>/dev/null || true
fi

wait "$CHROME_PID" 2>/dev/null || true

if [[ ! -s "$PDF" ]]; then
  echo "PDF export failed: $PDF" >&2
  exit 1
fi

echo "PDF exported to $PDF"
