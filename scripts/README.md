# Scripts

Android dev loop lives here.

## Why

Sparkling HMR path did not reliably update UI on the Android emulator.
The app could fetch bundles, but live reload never reached the running UI.

So this repo uses a simpler loop:

- watch source changes
- rebuild bundles
- reinstall Android app
- relaunch on emulator or real device

This is slower than HMR, but it is stable and matches the actual working path.

## Files

- `android-dev.sh` sets Android and Java env, starts emulator if needed, then launches the dev loop.
- `android-dev.ts` watches source files, rebuilds, and reinstalls the app.
- `verify-docs.ts` verifies that documented commands in AGENTS.md match `package.json` scripts.

---

## Real Device Setup (one-time)

`bun dev` and `bun run smoke` work with a real Android device automatically — no configuration
needed. If an authorized device is connected, `android-dev.sh` skips launching the emulator and
uses the real device instead.

### Step 1 — Enable Developer Options

1. Open **Settings → About Phone**
2. Tap **Build Number** 7 times rapidly (haptic feedback counts down: "4 more taps…")
3. Enter your PIN/password if prompted
4. "You are now a developer!" appears
5. Developer Options now appears at **Settings → System → Developer Options**
   (on some builds it shows at top-level Settings; on Android 16 / Pixel it's under System)

> **Tip**: If you can't find Build Number, look under Settings → About Phone →
> **Software Information** → Build Number.

### Step 2 — Enable USB Debugging

1. Open **Settings → Developer Options**
2. Toggle **USB Debugging** → ON

### Step 3 — Connect via USB

1. Plug the phone into your Mac with a **USB-C data cable** (not a charge-only cable — if nothing
   appears on the phone, try a different cable)
2. A prompt appears on the phone: **"Use USB for:"**
   - **Controlled by** → select **"This device"** (the phone controls the connection — correct for
     development; "Connected device" makes the phone a USB host for accessories, not what you want)
   - **Use USB for** → select **"File Transfer"** or **"No Data Transfer"** (either works; ADB
     operates independently of the file transfer mode — avoid "USB tethering", "MIDI", "PTP", or
     "Webcam")
3. A second prompt appears: **"Allow USB debugging from this computer?"**
   - Tap **Allow**
   - Check **"Always allow from this computer"** to avoid re-prompting on future connections

### Step 4 — Verify the connection

```sh
bun run device:check
# Should show: <device-serial>  device
#
# If it shows "unauthorized": re-plug and re-authorize on the phone
# If it shows nothing: check the cable, USB mode, and USB debugging setting
```

### Running on device

```sh
# One-shot: build → install → launch
bun run smoke

# Watch mode: rebuild + reinstall on every src change
bun dev

# Tail app logs from the connected device
bun run log:app
```

### Wireless ADB (optional, Android 11+)

After the device is trusted over USB, you can switch to wireless:

1. Settings → Developer Options → **Wireless Debugging** → ON
2. Tap **Pair device with pairing code** — note the IP address, port, and pairing code shown
3. On your Mac: `adb pair <ip>:<port>` → enter the pairing code
4. Then: `adb connect <ip>:<port>` (use the "IP address & Port" shown on-device, not the pairing port)
5. Unplug USB — ADB continues over Wi-Fi

### Gotchas

- **Multiple devices connected at once** (emulator + real device): `adb` target is ambiguous.
  Disconnect the emulator or run `adb -s <serial>` explicitly.
- **API level**: Device must be API 24+ (minSdk = 24). API 34+ is recommended for Phase 4
  (`foregroundServiceType="health"` is an Android 14 / API 34 requirement).
