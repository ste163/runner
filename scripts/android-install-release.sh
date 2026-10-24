#!/usr/bin/env sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
. "$SCRIPT_DIR/android-env.sh"

ANDROID_DIR="$SCRIPT_DIR/../android"
APK="$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk"

setup_android_env

"$ANDROID_DIR/gradlew" -p "$ANDROID_DIR" assembleRelease
adb install -r "$APK"
adb shell am start -n com.ste163.runner/.SplashActivity
