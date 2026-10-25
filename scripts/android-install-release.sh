#!/usr/bin/env sh
set -eu

# shellcheck disable=SC1007
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
# shellcheck source=android-env.sh
. "$SCRIPT_DIR/android-env.sh"

ANDROID_DIR="$SCRIPT_DIR/../android"
APK="$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk"

setup_android_env

# Release install path: assembleRelease is signed with the debug key, so
# `adb install -r` upgrades the debug install in place.
"$ANDROID_DIR/gradlew" -p "$ANDROID_DIR" assembleRelease
adb install -r "$APK"
adb shell am start -n com.ste163.runner/.SplashActivity
