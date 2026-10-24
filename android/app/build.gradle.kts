plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.kapt)
}

android {
    namespace = "com.ste163.runner"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.ste163.runner"
        minSdk = 35
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
        // arm64 only: the device is arm64 and Apple Silicon emulators run arm64 images
        ndk {
            abiFilters.addAll(listOf("arm64-v8a"))
        }
        buildTypes {
            release {
                // Debug key: adb install -r upgrades the debug install in place
                signingConfig = signingConfigs.getByName("debug")
                // R8 relies on the Lynx keep rules in proguard-rules.pro
                isMinifyEnabled = true
                // Excludes proven by cold-boot test on the device:
                //   liblynx_debug.so          release loads liblynx.so instead
                //   libv8_*                  V8 is optional (DevTool-only engine);
                //                           Android default is PrimJS/QuickJS
                //   liblynxdevtool*, router, basedevtool, trace
                //                           devtool pulled transitively by the
                //                           Sparkling SDK; app code never uses it
                // WARNING: never exclude libquick.so - it IS the engine (PrimJS).
                //   Boot crashes in LynxEnv.init without it.
                packaging {
                    jniLibs {
                        excludes += "**/liblynx_debug.so"
                        excludes += "**/libv8_libfull.cr.so"
                        excludes += "**/libnapi_v8.so"
                        excludes += "**/liblynx_v8_bridge.so"
                        excludes += "**/liblynxdevtool.so"
                        excludes += "**/liblynxdebugrouter.so"
                        excludes += "**/libbasedevtool.so"
                        excludes += "**/liblynxdevtool_js_bridge.so"
                        excludes += "**/liblynxtrace.so"
                    }
                }
                proguardFiles(
                    getDefaultProguardFile("proguard-android-optimize.txt"),
                    "proguard-rules.pro",
                )
            }
        }

        compileOptions {
            sourceCompatibility = JavaVersion.VERSION_17
            targetCompatibility = JavaVersion.VERSION_17
        }
        kotlinOptions {
            jvmTarget = "17"
        }

        // Serve assets directly from dist; no copy step
        sourceSets {
            getByName("main").apply {
                assets.setSrcDirs(listOf("../../dist"))
            }
        }
    }

    dependencies {
        implementation(libs.androidx.core.ktx)
        implementation(libs.androidx.appcompat)

        implementation("com.tiktok.sparkling:sparkling:2.0.1")
        implementation("com.tiktok.sparkling:sparkling-method:2.0.1")
        implementation("com.squareup.okhttp3:okhttp:4.9.0")

        implementation(libs.lynx)
        implementation(libs.lynx.jssdk)
        // debug-only: tooling for DevTool/Trace; kept out of release
        debugImplementation(libs.lynx.trace)
        debugImplementation(libs.lynx.devtool)
        implementation(libs.primjs)
        implementation(libs.lynx.service.image)
        implementation(libs.lynx.service.log)
        implementation(libs.lynx.service.http)
        // debug-only: DevTool service (see release packaging excludes)
        debugImplementation(libs.lynx.service.devtool)
        implementation("org.lynxsdk.lynx:xelement-svg:4.1.0")

        implementation(libs.fresco)
        implementation(libs.fresco.animated.webp)
        implementation(libs.fresco.webp.support)
        implementation(libs.fresco.animated.base)

//    kapt(libs.lynx.processor)

        testImplementation(libs.junit)
        testImplementation("org.mockito:mockito-inline:5.2.0")

        // BEGIN SPARKLING AUTOLINK
        listOf(
            project(":sparkling-navigation")
        ).forEach { dep -> add("implementation", dep) }
        // END SPARKLING AUTOLINK
    }
}
