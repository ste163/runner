#!/usr/bin/env sh
set -eu

android_home() {
  # Prefer explicit env, then common macOS SDK location.
  if [ -n "${ANDROID_HOME:-}" ]; then
    printf '%s' "$ANDROID_HOME"
    return 0
  fi

  if [ -n "${ANDROID_SDK_ROOT:-}" ]; then
    printf '%s' "$ANDROID_SDK_ROOT"
    return 0
  fi

  printf '%s' "$HOME/Library/Android/sdk"
}

java_home() {
  # Prefer explicit env, then macOS JDK 17 lookup, then Homebrew.
  if [ -n "${JAVA_HOME:-}" ]; then
    printf '%s' "$JAVA_HOME"
    return 0
  fi

  if command -v /usr/libexec/java_home >/dev/null 2>&1; then
    local_home="$(/usr/libexec/java_home -v 17 2>/dev/null || true)"
    if [ -n "$local_home" ]; then
      printf '%s' "$local_home"
      return 0
    fi
  fi

  if command -v brew >/dev/null 2>&1; then
    printf '%s' "$(brew --prefix openjdk@17)/libexec/openjdk.jdk/Contents/Home"
  fi
}

setup_android_env() {
  ANDROID_HOME="$(android_home)"
  JAVA_HOME="$(java_home)"
  export ANDROID_HOME JAVA_HOME
  export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
}

adb_bin() {
  printf '%s' "$(android_home)/platform-tools/adb"
}

emulator_bin() {
  printf '%s' "$(android_home)/emulator/emulator"
}

has_connected_device() {
  "$(adb_bin)" devices | awk 'NR > 1 && $2 == "device" { found = 1 } END { exit found ? 0 : 1 }'
}

start_emulator_if_needed() {
  # Reuse an attached device if one already exists.
  if has_connected_device; then
    return 0
  fi

  AVD_NAME="${ANDROID_AVD:-}"
  if [ -z "$AVD_NAME" ]; then
    AVD_NAME="$($(emulator_bin) -list-avds | sed -n '1p')"
  fi

  if [ -z "$AVD_NAME" ]; then
    printf '%s\n' 'No Android emulator found. Set ANDROID_AVD or create one in the SDK.'
    exit 1
  fi

  "$(emulator_bin)" -avd "$AVD_NAME" >/dev/null 2>&1 &

  until has_connected_device; do
    sleep 2
  done
}

setup_android_env
start_emulator_if_needed

exec bun ./scripts/android-dev.ts
