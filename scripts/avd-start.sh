#!/usr/bin/env sh
set -eu

. "$(dirname "$0")/android-common.sh"

AVD_NAME="${ANDROID_AVD:?set ANDROID_AVD}"
"$(emulator_bin)" -avd "$AVD_NAME" >/dev/null 2>&1 &
