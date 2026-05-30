package com.example.sparkling.go

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator

import com.lynx.jsbridge.LynxMethod
import com.lynx.jsbridge.LynxModule

class RunnerHapticModule(context: Context) : LynxModule(context) {

    private fun resolveVibrator(): Vibrator? {
        return mContext.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
    }

    @LynxMethod
    fun vibrate(durationMs: Double) {
        val vibrator = resolveVibrator() ?: return
        val safeDurationMs = durationMs.toLong().coerceAtLeast(0L)

        if (!vibrator.hasVibrator()) return

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(
                VibrationEffect.createOneShot(
                    safeDurationMs,
                    VibrationEffect.DEFAULT_AMPLITUDE,
                )
            )
            return
        }

        @Suppress("DEPRECATION")
        vibrator.vibrate(safeDurationMs)
    }

    @LynxMethod
    fun cancel() {
        resolveVibrator()?.cancel()
    }
}
