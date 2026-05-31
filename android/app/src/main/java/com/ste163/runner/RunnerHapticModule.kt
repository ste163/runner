package com.ste163.runner

import android.content.Context
import android.os.VibrationEffect
import android.os.Vibrator

import com.lynx.jsbridge.LynxMethod
import com.lynx.jsbridge.LynxModule

class RunnerHapticModule(context: Context) : LynxModule(context) {

    private fun resolveVibrator(): Vibrator? {
        return mContext.getSystemService(Vibrator::class.java)
    }

    @LynxMethod
    fun vibrate(durationMs: Double) {
        val vibrator = resolveVibrator() ?: return
        val safeDurationMs = durationMs.toLong().coerceAtLeast(0L)

        if (!vibrator.hasVibrator()) return

        vibrator.vibrate(
            VibrationEffect.createOneShot(
                safeDurationMs,
                VibrationEffect.DEFAULT_AMPLITUDE,
            )
        )
    }

    @LynxMethod
    fun cancel() {
        resolveVibrator()?.cancel()
    }
}
