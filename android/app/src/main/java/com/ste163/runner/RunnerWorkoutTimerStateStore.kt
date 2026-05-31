package com.ste163.runner

object RunnerWorkoutTimerStateStore {

    @Volatile private var stateJson: String? = null

    fun load(): String? {
        return stateJson
    }

    fun save(stateJson: String) {
        this.stateJson = stateJson
    }
}
