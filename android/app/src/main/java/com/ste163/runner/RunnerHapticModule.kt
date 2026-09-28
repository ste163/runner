package com.ste163.runner

import android.content.Context
import android.os.VibrationEffect
import android.os.Vibrator

import com.lynx.jsbridge.LynxMethod
import com.lynx.jsbridge.LynxModule

import org.json.JSONArray

class RunnerHapticModule(context: Context) : LynxModule(context) {

    private fun resolveVibrator(): Vibrator? {
        return mContext.getSystemService(Vibrator::class.java)
    }

    private fun parsePatternJson(patternJson: String): LongArray? {
        val values = try {
            JSONArray(patternJson)
        } catch (_: Exception) {
            return null
        }

        if (values.length() == 0) return null

        val pattern = LongArray(values.length())
        for (index in 0 until values.length()) {
            pattern[index] = values.optLong(index, 0L).coerceAtLeast(0L)
        }

        return pattern
    }

    private fun buildAmplitudes(patternSize: Int): IntArray {
        return IntArray(patternSize) { index ->
            if (index % 2 == 0) 0 else VibrationEffect.DEFAULT_AMPLITUDE
        }
    }

    @LynxMethod
    fun vibratePattern(patternJson: String) {
        val vibrator = resolveVibrator() ?: return

        if (!vibrator.hasVibrator()) return

        val pattern = parsePatternJson(patternJson) ?: return

        vibrator.vibrate(
            VibrationEffect.createWaveform(pattern, buildAmplitudes(pattern.size), -1)
        )
    }

    @LynxMethod
    fun cancel() {
        resolveVibrator()?.cancel()
    }
}
