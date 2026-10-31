#!/usr/bin/env bash
# Command policy tiers (single source of truth; AGENTS.md summarizes):
#   ALLOW - checks/validation, unit tests, everything harmless.
#   ASK   - builds. Blocked with an ask-first reason; approved runs carry RUNNER_APPROVED=1.
#   NEVER - anything touching the plugged-in device. Blocked; the user runs those.
# Reads the tool input JSON from $1; exits 1 with a reason when the command is blocked.
set -euo pipefail

PAYLOAD="${1:-}"
CMD=$(printf '%s' "$PAYLOAD" | python3 -c "
import json, sys
d = json.load(sys.stdin)
print(d.get('command', ''))
" 2>/dev/null || echo "")

# NEVER tier - device-affecting commands are never run by the agent.
if echo "$CMD" | grep -qE "\badb\b|bun dev\b|bun run dev\b|bun run android|bun run log|android-install-debug\.sh|android-install-release\.sh|gradlew? .*(install|connected|managedDevices)"; then
  echo "This affects your plugged-in device. Ask the user first - they run device commands themselves."
  exit 1
fi

# ASK tier - approved builds carry the RUNNER_APPROVED=1 prefix.
if echo "$CMD" | grep -q "RUNNER_APPROVED=1"; then
  exit 0
fi

if echo "$CMD" | grep -qE "bun run build|bun run smoke|rspeedy build|gradlew? .*(assemble|bundle)"; then
  echo "Build command - ask the user first. If they approve, rerun with the RUNNER_APPROVED=1 prefix."
  exit 1
fi

exit 0
