package com.ste163.runner

object RunnerWorkoutTimerStateStore {

    @Volatile private var stateJson: String? = null

    fun load(): String? {
        return stateJson
    }

    fun clear() {
        stateJson = null
    }

    fun save(stateJson: String) {
        this.stateJson = stateJson
    }
}
