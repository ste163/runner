# Android Build Notes

## JS engine

Android runs PrimJS (QuickJS-based) on both threads. V8 ships in the APK only
for the optional DevTool V8 debug switch - it is not the default engine.

Release packaging excludes V8, devtool, and the debug-variant engine. Each
exclude is explained next to the list in `app/build.gradle.kts`.

Never exclude `libquick.so` - it IS the engine (PrimJS). Boot crashes in
`LynxEnv.init` without it.

## After upgrading Lynx or Sparkling SDKs

Re-run the release boot test:

```sh
./gradlew -p android assembleRelease
adb install -r android/app/build/outputs/apk/release/app-release.apk
adb shell am force-stop com.ste163.runner
adb logcat -c && adb shell am start -n com.ste163.runner/.SplashActivity
```

Pass = process alive (`adb shell pidof com.ste163.runner`), `dumpsys activity
activities` shows SparklingActivity as topResumed, and no FATAL /
UnsatisfiedLink / dlopen lines in `adb logcat`.
