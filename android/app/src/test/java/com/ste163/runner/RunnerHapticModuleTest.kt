package com.ste163.runner

import android.content.Context
import android.os.VibrationEffect
import android.os.Vibrator

import org.junit.Test
import org.mockito.Mockito

class RunnerHapticModuleTest {

    private val context = Mockito.mock(Context::class.java)
    private val vibrator = Mockito.mock(Vibrator::class.java)

    private fun buildModule(): RunnerHapticModule {
        Mockito.`when`(context.getSystemService(Vibrator::class.java)).thenReturn(vibrator)
        Mockito.`when`(vibrator.hasVibrator()).thenReturn(true)
        return RunnerHapticModule(context)
    }

    @Test
    fun vibratePatternForwardsWaveformToVibrator() {
        val module = buildModule()

        module.vibratePattern("[0,70,150,70]")

        Mockito.verify(vibrator).vibrate(Mockito.nullable(VibrationEffect::class.java))
    }

    @Test
    fun vibratePatternSkipsWhenDeviceHasNoVibrator() {
        Mockito.`when`(context.getSystemService(Vibrator::class.java)).thenReturn(vibrator)
        Mockito.`when`(vibrator.hasVibrator()).thenReturn(false)
        val module = RunnerHapticModule(context)

        module.vibratePattern("[0,70,150,70]")

        Mockito.verify(vibrator, Mockito.never()).vibrate(Mockito.nullable(VibrationEffect::class.java))
    }

    @Test
    fun vibratePatternSkipsInvalidJson() {
        val module = buildModule()

        module.vibratePattern("not-json")

        Mockito.verify(vibrator, Mockito.never()).vibrate(Mockito.nullable(VibrationEffect::class.java))
    }

    @Test
    fun cancelForwardsToVibrator() {
        val module = buildModule()

        module.cancel()

        Mockito.verify(vibrator).cancel()
    }
}
