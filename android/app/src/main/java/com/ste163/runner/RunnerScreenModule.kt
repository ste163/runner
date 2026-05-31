package com.ste163.runner

import android.app.Activity
import android.content.Context
import android.view.WindowManager

import com.lynx.jsbridge.LynxMethod
import com.lynx.jsbridge.LynxModule
import com.tiktok.sparkling.hybridkit.service.HybridActivityStackManager

class RunnerScreenModule(context: Context) : LynxModule(context) {

    private fun resolveActivity(): Activity? {
        return mContext as? Activity ?: HybridActivityStackManager.getTopActivity()
    }

    private fun updateKeepScreenOn(enabled: Boolean) {
        val activity = resolveActivity() ?: return

        activity.runOnUiThread {
            if (enabled) {
                activity.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            } else {
                activity.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            }
        }
    }

    @LynxMethod
    fun keepScreenOn(enabled: Boolean) {
        updateKeepScreenOn(enabled)
    }
}
