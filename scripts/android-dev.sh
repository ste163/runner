#!/usr/bin/env sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
. "$SCRIPT_DIR/android-env.sh"

adb_bin() {
  printf '%s' "$(android_home)/platform-tools/adb"
}

emulator_bin() {
  printf '%s' "$(android_home)/emulator/emulator"
}

has_connected_device() {
  "$(adb_bin)" devices | awk 'NR > 1 && $2 == "device" { found = 1 } END { exit found ? 0 : 1 }'
}

start_emulator_if_needed() {
  # Reuse an attached device if one already exists.
  if has_connected_device; then
    return 0
  fi

  AVD_NAME="${ANDROID_AVD:-}"
  if [ -z "$AVD_NAME" ]; then
    AVD_NAME="$($(emulator_bin) -list-avds | sed -n '1p')"
  fi

  if [ -z "$AVD_NAME" ]; then
    printf '%s\n' 'No Android emulator found. Set ANDROID_AVD or create one in the SDK.'
    exit 1
  fi

  "$(emulator_bin)" -avd "$AVD_NAME" >/dev/null 2>&1 &

  until has_connected_device; do
    sleep 2
  done
}

setup_android_env
start_emulator_if_needed

exec bun ./scripts/android-dev.ts
