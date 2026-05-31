package com.ste163.runner

import android.content.Context

import com.lynx.jsbridge.LynxMethod
import com.lynx.jsbridge.LynxModule

class RunnerWorkoutTimerModule(context: Context) : LynxModule(context) {

    @LynxMethod
    fun getWorkoutTimerState(): String? {
        return RunnerWorkoutTimerStateStore.load()
    }

    @LynxMethod
    fun startWorkout(runSeconds: Double, walkSeconds: Double, intervalBlockSeconds: Double) {
        RunnerWorkoutTimerService.startWorkout(
            mContext,
            runSeconds,
            walkSeconds,
            intervalBlockSeconds,
        )
    }

    @LynxMethod
    fun pauseWorkout() {
        RunnerWorkoutTimerService.pauseWorkout(mContext)
    }

    @LynxMethod
    fun resumeWorkout() {
        RunnerWorkoutTimerService.resumeWorkout(mContext)
    }

    @LynxMethod
    fun stopWorkout() {
        RunnerWorkoutTimerService.stopWorkout(mContext)
    }
}
