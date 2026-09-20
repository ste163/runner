#!/usr/bin/env bash
set -e

echo '--- Verification ---'
bun typecheck
bun run test
bun lint
bun run verify-docs
echo '✓ typecheck + test + lint + doc-sync passed'
