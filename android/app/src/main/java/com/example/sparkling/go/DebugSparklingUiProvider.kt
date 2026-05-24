// Copyright (c) 2025 TikTok Pte. Ltd.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.
package com.example.sparkling.go

import android.content.Context
import android.view.Gravity
import android.view.View
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.widget.Toolbar
import com.tiktok.sparkling.SparklingUIProvider

class DebugSparklingUiProvider(
    private val initialDataJson: String,
    private val debugScheme: String,
) : SparklingUIProvider {
    override fun getLoadingView(context: Context): View {
        return ProgressBar(context).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT,
                Gravity.CENTER,
            )
        }
    }

    override fun getErrorView(context: Context): View {
        return LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(48, 48, 48, 48)
            addView(TextView(context).apply { text = "Failed to load Sparkling app." })
        }
    }

    override fun getToolBar(context: Context): Toolbar? = null
}
