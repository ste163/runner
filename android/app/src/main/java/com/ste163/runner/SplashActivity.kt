// Copyright (c) 2025 TikTok Pte. Ltd.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.
package com.ste163.runner

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.tiktok.sparkling.Sparkling
import com.tiktok.sparkling.SparklingContext
import com.tiktok.sparkling.method.registry.core.utils.JsonUtils
import com.ste163.runner.DebugDevUrlSupport
import com.ste163.runner.DebugSparklingUiProvider

class SplashActivity : AppCompatActivity() {
    private val notificationPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) {
            ensureLocationPermission()
        }

    private val locationPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) {
            gotoSparklingPage()
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        ensureNotificationPermission()
    }

    private fun ensureNotificationPermission() {
        if (hasNotificationPermission()) {
            ensureLocationPermission()
        } else {
            notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    private fun ensureLocationPermission() {
        if (hasLocationPermission()) {
            gotoSparklingPage()
        } else {
            locationPermissionLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION)
        }
    }

    private fun hasNotificationPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.POST_NOTIFICATIONS,
        ) == PackageManager.PERMISSION_GRANTED
    }

    private fun hasLocationPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.ACCESS_FINE_LOCATION,
        ) == PackageManager.PERMISSION_GRANTED
    }

    private fun gotoSparklingPage() {
        val initData = mapOf<Any, Any>()
        val initialData: String = JsonUtils.toJson(initData)
        val launchScheme = if (isDebuggable) {
            DebugDevUrlSupport.buildMainPageScheme()
        } else {
            "hybrid://lynxview_page?bundle=home.lynx.bundle&hide_nav_bar=1&screen_orientation=portrait"
        }

        val context = SparklingContext()
        context.scheme = launchScheme
        if (isDebuggable) {
            context.sparklingUIProvider = DebugSparklingUiProvider(initialData.toString(), launchScheme)
        }
        context.withInitData("{ \"initial_data\":$initialData}")
        Sparkling.build(this, context).navigate()
        finish()
    }
}
