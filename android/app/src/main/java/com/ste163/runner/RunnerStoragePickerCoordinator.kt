package com.ste163.runner

import android.net.Uri

import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

object RunnerStoragePickerCoordinator {

    private val requests = ConcurrentHashMap<String, (Uri?) -> Unit>()

    fun register(onResult: (Uri?) -> Unit): String {
        val requestId = UUID.randomUUID().toString()
        requests[requestId] = onResult
        return requestId
    }

    fun deliver(requestId: String, uri: Uri?) {
        val request = requests.remove(requestId) ?: return
        request(uri)
    }

    fun cancel(requestId: String) {
        requests.remove(requestId)
    }
}
