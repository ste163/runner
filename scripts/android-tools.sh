#!/usr/bin/env sh
set -eu

. "$(dirname "$0")/android-common.sh"

setup_android_env

case "${1:-}" in
  adb:devices)
    exec "$(adb_bin)" devices
    ;;
  avd:list)
    exec "$(emulator_bin)" -list-avds
    ;;
  avd:start)
    AVD_NAME="${ANDROID_AVD:?set ANDROID_AVD}"
    exec "$(emulator_bin)" -avd "$AVD_NAME"
    ;;
  *)
    printf '%s\n' 'Usage: android-tools.sh {adb:devices|avd:list|avd:start}'
    exit 1
    ;;
esac
