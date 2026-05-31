#!/usr/bin/env sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
. "$SCRIPT_DIR/android-env.sh"

setup_android_env
cd "$SCRIPT_DIR/../android"
exec ./gradlew :app:testDebugUnitTest --no-daemon
