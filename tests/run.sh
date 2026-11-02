#!/usr/bin/env bash
# Run the whole suite. Usage: ./run.sh [node-binary]
set -u
NODE="${1:-node}"
DIR="$(cd "$(dirname "$0")" && pwd)"
fail=0
for t in "$DIR"/*.test.js; do
  "$NODE" "$t" || fail=1
done
if [ "$fail" -eq 0 ]; then
  echo "—— ALL TESTS PASSED ——"
else
  echo "—— SUITE FAILED ——" >&2
  exit 1
fi
