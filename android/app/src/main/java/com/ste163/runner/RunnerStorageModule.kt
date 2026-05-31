package com.ste163.runner

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Handler
import android.os.Looper

import com.lynx.jsbridge.LynxMethod
import com.lynx.jsbridge.LynxModule
import com.lynx.react.bridge.Callback

import org.json.JSONException
import org.json.JSONObject

import java.io.File
import java.io.FileOutputStream

class RunnerStorageModule(context: Context) : LynxModule(context) {

    private val profileFileName = "training_profile.json"
    private val backupFileName = "training_profile.json.bak"
    private val tempFileName = "training_profile.json.tmp"
    private val exportFileName = "runner-training-profile.json"
    private val mainHandler = Handler(Looper.getMainLooper())

    private fun profileFile(): File {
        return File(mContext.filesDir, profileFileName)
    }

    private fun backupFile(): File {
        return File(mContext.filesDir, backupFileName)
    }

    private fun tempFile(): File {
        return File(mContext.filesDir, tempFileName)
    }

    private fun ensureParentDirectory(file: File) {
        file.parentFile?.mkdirs()
    }

    private fun validateProfileJson(profileJson: String): String {
        JSONObject(profileJson)
        return profileJson
    }

    private fun readValidJson(file: File): String? {
        if (!file.exists()) {
            return null
        }

        val contents = file.readText(Charsets.UTF_8)
        return try {
            validateProfileJson(contents)
        } catch (exception: JSONException) {
            null
        }
    }

    private fun syncFile(fileOutputStream: FileOutputStream) {
        fileOutputStream.fd.sync()
    }

    private fun writeAtomic(file: File, contents: String) {
        ensureParentDirectory(file)

        val targetTempFile = tempFile()
        FileOutputStream(targetTempFile).use { outputStream ->
            outputStream.write(contents.toByteArray(Charsets.UTF_8))
            outputStream.flush()
            syncFile(outputStream)
        }

        if (file.exists() && !file.delete()) {
            targetTempFile.delete()
            throw IllegalStateException("Unable to replace training profile file.")
        }

        if (!targetTempFile.renameTo(file)) {
            targetTempFile.delete()
            throw IllegalStateException("Unable to commit training profile file.")
        }
    }

    private fun preserveCurrentProfileIfValid() {
        val currentProfile = readValidJson(profileFile()) ?: return
        ensureParentDirectory(backupFile())
        FileOutputStream(backupFile()).use { outputStream ->
            outputStream.write(currentProfile.toByteArray(Charsets.UTF_8))
            outputStream.flush()
            syncFile(outputStream)
        }
    }

    private fun readUriText(uriString: String): String {
        val inputUri = Uri.parse(uriString)
        val inputStream = mContext.contentResolver.openInputStream(inputUri)
            ?: throw IllegalStateException("Unable to open training profile import source.")

        return inputStream.bufferedReader(Charsets.UTF_8).use { bufferedReader ->
            bufferedReader.readText()
        }
    }

    private fun writeUriText(uriString: String, contents: String) {
        val outputUri = Uri.parse(uriString)
        val outputStream = mContext.contentResolver.openOutputStream(outputUri, "wt")
            ?: throw IllegalStateException("Unable to open training profile export destination.")

        outputStream.use { stream ->
            stream.write(contents.toByteArray(Charsets.UTF_8))
            stream.flush()
        }
    }

    private fun respond(callback: Callback?, status: String, detail: String?) {
        callback?.invoke(status, detail)
    }

    private fun handleExportResult(callback: Callback, destinationUri: Uri?) {
        if (destinationUri == null) {
            respond(callback, "cancelled", null)
            return
        }

        try {
            val profileJson = loadProfileJson()

            if (profileJson == null) {
                respond(callback, "error", "No saved profile is available to export.")
                return
            }

            writeUriText(destinationUri.toString(), profileJson)
            respond(callback, "success", destinationUri.toString())
        } catch (exception: Exception) {
            respond(callback, "error", exception.message ?: "Unable to export training profile.")
        }
    }

    private fun handleImportResult(callback: Callback, sourceUri: Uri?) {
        if (sourceUri == null) {
            respond(callback, "cancelled", null)
            return
        }

        try {
            val profileJson = validateProfileJson(readUriText(sourceUri.toString()))
            preserveCurrentProfileIfValid()
            writeAtomic(profileFile(), profileJson)
            respond(callback, "success", profileJson)
        } catch (exception: Exception) {
            respond(callback, "error", exception.message ?: "Unable to import training profile.")
        }
    }

    private fun launchPickerActivity(action: String, requestId: String, onError: (Exception) -> Unit) {
        val intent = Intent(mContext, RunnerStoragePickerActivity::class.java)
            .putExtra(RunnerStoragePickerActivity.EXTRA_ACTION, action)
            .putExtra(RunnerStoragePickerActivity.EXTRA_REQUEST_ID, requestId)

        if (mContext !is Activity) {
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }

        mainHandler.post {
            try {
                mContext.startActivity(intent)
            } catch (exception: Exception) {
                RunnerStoragePickerCoordinator.cancel(requestId)
                onError(exception)
            }
        }
    }

    private fun requestExport(callback: Callback) {
        val requestId = RunnerStoragePickerCoordinator.register { destinationUri ->
            handleExportResult(callback, destinationUri)
        }

        launchPickerActivity(RunnerStoragePickerActivity.ACTION_EXPORT, requestId) { exception ->
            respond(callback, "error", exception.message ?: "Unable to open the file picker.")
        }
    }

    private fun requestImport(callback: Callback) {
        val requestId = RunnerStoragePickerCoordinator.register { sourceUri ->
            handleImportResult(callback, sourceUri)
        }

        launchPickerActivity(RunnerStoragePickerActivity.ACTION_IMPORT, requestId) { exception ->
            respond(callback, "error", exception.message ?: "Unable to open the file picker.")
        }
    }

    @LynxMethod
    fun loadProfileJson(): String? {
        val mainProfile = readValidJson(profileFile())

        if (mainProfile != null) {
            return mainProfile
        }

        val backupProfile = readValidJson(backupFile())

        if (backupProfile != null) {
            writeAtomic(profileFile(), backupProfile)
            return backupProfile
        }

        if (profileFile().exists() || backupFile().exists()) {
            throw IllegalStateException("Unable to load training profile.")
        }

        return null
    }

    @LynxMethod
    fun saveProfileJson(profileJson: String) {
        validateProfileJson(profileJson)
        preserveCurrentProfileIfValid()
        writeAtomic(profileFile(), profileJson)
    }

    @LynxMethod
    fun resetProfile() {
        profileFile().delete()
        backupFile().delete()
        tempFile().delete()
    }

    @LynxMethod
    fun exportProfile(callback: Callback) {
        requestExport(callback)
    }

    @LynxMethod
    fun importProfile(callback: Callback) {
        requestImport(callback)
    }
}
