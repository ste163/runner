#!/usr/bin/env bash
# Blocks Android-only commands that require macOS + Android SDK + emulator.
# Reads the tool input JSON from $1; exits 1 with a reason when the command is blocked.
set -euo pipefail

PAYLOAD="${1:-}"
CMD=$(printf '%s' "$PAYLOAD" | python3 -c "
import json, sys
d = json.load(sys.stdin)
print(d.get('command', ''))
" 2>/dev/null || echo "")

if echo "$CMD" | grep -qE "bun (run build|run dev|dev|run smoke|run android|run log)"; then
  echo "This command requires macOS + Android SDK + a connected emulator. Verify your environment and run it manually if ready."
  exit 1
fi
exit 0
