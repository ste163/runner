#!/usr/bin/env sh
set -eu

. "$(dirname "$0")/android-common.sh"

log() {
  printf '%s\n' "$1"
}

setup_android_env
log 'android:hot: env ready'

log 'android:hot: waiting for emulator'
start_emulator_if_needed
log 'android:hot: emulator ready'
reverse_android_port 3000

DEV_LOG=/tmp/runner-sparkling-dev.log
log "android:hot: starting dev server -> $DEV_LOG"
rspeedy dev >"$DEV_LOG" 2>&1 &
DEV_PID=$!
tail -f "$DEV_LOG" &
TAIL_PID=$!

cleanup() {
  kill "$DEV_PID" >/dev/null 2>&1 || true
  kill "$TAIL_PID" >/dev/null 2>&1 || true
}

trap cleanup INT TERM EXIT

log 'android:hot: waiting for dev bundle'
until curl -fsS "http://127.0.0.1:3000/main.lynx.bundle" >/dev/null 2>&1; do
  if ! kill -0 "$DEV_PID" >/dev/null 2>&1; then
    wait "$DEV_PID"
    exit 1
  fi
  sleep 1
done

log 'android:hot: dev bundle ready'
log 'android:hot: installing android debug build'
sparkling-app-cli run:android

log 'android:hot: keeping dev server alive'
wait "$DEV_PID"
