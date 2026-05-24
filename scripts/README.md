# Scripts

Android dev loop lives here.

## Why

Sparkling HMR path did not reliably update UI on the Android emulator.
The app could fetch bundles, but live reload never reached the running UI.

So this repo uses a simpler loop:

- watch source changes
- rebuild bundles
- reinstall Android app
- relaunch on emulator

This is slower than HMR, but it is stable and matches the actual working path.

## Files

- `android-dev.sh` sets Android and Java env, starts emulator, then launches the dev loop.
- `android-dev.ts` watches source files, rebuilds, and reinstalls the app.
