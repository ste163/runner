package com.ste163.runner

import android.os.Handler
import android.os.Looper

import com.lynx.react.bridge.Callback

object RunnerWorkoutTimerEventBridge {

    private val mainHandler = Handler(Looper.getMainLooper())
    @Volatile private var callback: Callback? = null
    @Volatile private var lastDetail: String? = null
    @Volatile private var lastStatus: String? = null

    fun observe(callback: Callback) {
        this.callback = callback

        val status = lastStatus
        val detail = lastDetail

        if (status != null && detail != null) {
            mainHandler.post {
                callback.invoke(status, detail)
            }
        }
    }

    fun clearListener() {
        callback = null
    }

    fun clearState() {
        lastStatus = null
        lastDetail = null
    }

    fun emit(status: String, detail: String) {
        lastStatus = status
        lastDetail = detail

        val currentCallback = callback ?: return

        mainHandler.post {
            currentCallback.invoke(status, detail)
        }
    }
}
