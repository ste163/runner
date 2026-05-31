package com.ste163.runner

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle

import androidx.appcompat.app.AppCompatActivity

class RunnerStoragePickerActivity : AppCompatActivity() {

    companion object {
        const val ACTION_EXPORT = "export"
        const val ACTION_IMPORT = "import"
        const val EXTRA_ACTION = "action"
        const val EXTRA_REQUEST_ID = "requestId"
        private const val REQUEST_CREATE_DOCUMENT = 1001
        private const val REQUEST_OPEN_DOCUMENT = 1002
    }

    private val requestId: String by lazy {
        intent.getStringExtra(EXTRA_REQUEST_ID) ?: ""
    }

    private val action: String by lazy {
        intent.getStringExtra(EXTRA_ACTION) ?: ""
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (savedInstanceState == null) {
            launchPicker()
        }
    }

    private fun launchPicker() {
        if (requestId.isEmpty() || action.isEmpty()) {
            finish()
            return
        }

        val pickerIntent = when (action) {
            ACTION_EXPORT -> Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE)
                type = "application/json"
                putExtra(Intent.EXTRA_TITLE, "runner-training-profile.json")
            }
            ACTION_IMPORT -> Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE)
                type = "*/*"
                putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("application/json", "text/plain", "text/*"))
            }
            else -> null
        }

        if (pickerIntent == null) {
            RunnerStoragePickerCoordinator.deliver(requestId, null)
            finish()
            return
        }

        try {
            @Suppress("DEPRECATION")
            startActivityForResult(
                pickerIntent,
                if (action == ACTION_EXPORT) REQUEST_CREATE_DOCUMENT else REQUEST_OPEN_DOCUMENT
            )
        } catch (exception: Exception) {
            RunnerStoragePickerCoordinator.deliver(requestId, null)
            finish()
        }
    }

    @Deprecated("Deprecated in Android API, but sufficient for the picker proxy activity.")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)

        if (requestId.isEmpty()) {
            finish()
            return
        }

        val uri: Uri? = if (resultCode == Activity.RESULT_OK) data?.data else null
        RunnerStoragePickerCoordinator.deliver(requestId, uri)
        finish()
    }
}
