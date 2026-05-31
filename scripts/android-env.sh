#!/usr/bin/env sh
set -eu

android_home() {
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
