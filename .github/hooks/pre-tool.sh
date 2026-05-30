#!/usr/bin/env bash
# Blocks Android-only commands that require macOS + Android SDK + emulator.
# Reads preToolUse JSON from stdin; outputs a deny decision if matched.
set -euo pipefail

INPUT=$(cat)
CMD=$(echo "$INPUT" | python3 -c "
import json, sys
d = json.load(sys.stdin)
args = d.get('toolArgs', {})
print(args.get('command', '') if isinstance(args, dict) else '')
" 2>/dev/null || echo "")

if echo "$CMD" | grep -qE "bun (run build|dev|run smoke|run android|run log)"; then
  echo '{"permissionDecision":"deny","permissionDecisionReason":"This command requires macOS + Android SDK + a connected emulator. Verify your environment and run it manually if ready."}'
fi
