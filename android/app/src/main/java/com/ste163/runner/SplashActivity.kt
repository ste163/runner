// Copyright (c) 2025 TikTok Pte. Ltd.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.
package com.ste163.runner

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.tiktok.sparkling.Sparkling
import com.tiktok.sparkling.SparklingContext
import com.tiktok.sparkling.method.registry.core.utils.JsonUtils
import com.ste163.runner.DebugDevUrlSupport
import com.ste163.runner.DebugSparklingUiProvider

class SplashActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        gotoSparklingPage()
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
