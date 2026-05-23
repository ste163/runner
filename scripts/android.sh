#!/usr/bin/env sh
set -eu

. "$(dirname "$0")/android-common.sh"

setup_android_env

if ! has_connected_device; then
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
fi

exec sparkling-app-cli run:android
