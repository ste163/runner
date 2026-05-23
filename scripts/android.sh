#!/usr/bin/env sh
set -eu

. "$(dirname "$0")/android-common.sh"

setup_android_env
start_emulator_if_needed
reverse_android_port 3000

exec sparkling-app-cli run:android
