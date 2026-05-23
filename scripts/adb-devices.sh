#!/usr/bin/env sh
set -eu

. "$(dirname "$0")/android-common.sh"
"$(adb_bin)" devices
