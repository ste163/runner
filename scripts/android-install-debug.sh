#!/usr/bin/env sh
set -eu

# shellcheck disable=SC1007
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
# shellcheck source=android-env.sh
. "$SCRIPT_DIR/android-env.sh"

ANDROID_DIR="$SCRIPT_DIR/../android"

setup_android_env

# Smoke install path: one bundle build (bun run build) + one gradle invocation.
# installDebug implies assembleDebug - no separate assemble step, no CLI double-build.
"$SCRIPT_DIR/../node_modules/.bin/sparkling-app-cli" autolink --platform android
"$ANDROID_DIR/gradlew" -p "$ANDROID_DIR" installDebug
adb shell am start -n com.ste163.runner/.SplashActivity
