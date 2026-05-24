#!/usr/bin/env sh
set -eu

. "$(dirname "$0")/android-common.sh"

setup_android_env
start_emulator_if_needed

exec bun ./scripts/android-hot.ts
