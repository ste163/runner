---
applyTo: 'android/**'
---

## Android Native Code — Stop and Ask

**Do not modify files in `android/` without explicit user approval.**

- Android builds require macOS + Android SDK + a connected emulator.
- Changes to native code (Gradle, Kotlin, Java, manifests) cannot be verified in this environment.
- Built Lynx bundles are copied here by `bun run build` — do not edit them manually.

Before touching any file in `android/`, pause and ask the user: what change is needed and confirm they want to proceed knowing it cannot be verified here.
