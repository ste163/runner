#!/usr/bin/env sh
set -eu

. "$(dirname "$0")/android-common.sh"
"$(emulator_bin)" -list-avds
