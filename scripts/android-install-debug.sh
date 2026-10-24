#!/usr/bin/env sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
. "$SCRIPT_DIR/android-env.sh"

ANDROID_DIR="$SCRIPT_DIR/../android"

setup_android_env

"$SCRIPT_DIR/../node_modules/.bin/sparkling-app-cli" autolink --platform android
"$ANDROID_DIR/gradlew" -p "$ANDROID_DIR" installDebug
adb shell am start -n com.ste163.runner/.SplashActivity
