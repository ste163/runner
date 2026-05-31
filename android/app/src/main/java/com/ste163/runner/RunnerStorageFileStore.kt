package com.ste163.runner

import org.json.JSONException
import org.json.JSONObject
import org.json.JSONTokener

import java.io.File
import java.io.FileOutputStream

internal class RunnerStorageFileStore(
    private val baseDirectory: File,
    private val jsonValidator: RunnerStorageJsonValidator = AndroidRunnerStorageJsonValidator(),
) {

    companion object {
        const val PROFILE_FILE_NAME = "training_profile.json"
        const val BACKUP_FILE_NAME = "training_profile.json.bak"
        const val TEMP_FILE_NAME = "training_profile.json.tmp"
    }

    private fun profileFile(): File = File(baseDirectory, PROFILE_FILE_NAME)

    private fun backupFile(): File = File(baseDirectory, BACKUP_FILE_NAME)

    private fun tempFile(): File = File(baseDirectory, TEMP_FILE_NAME)

    private fun ensureParentDirectory(file: File) {
        file.parentFile?.mkdirs()
    }

    private fun validateProfileJson(profileJson: String): String {
        return jsonValidator.validate(profileJson)
    }

    private fun readValidJson(file: File): String? {
        if (!file.exists()) {
            return null
        }

        val contents = file.readText(Charsets.UTF_8)
        return try {
            validateProfileJson(contents)
        } catch (exception: IllegalArgumentException) {
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

    fun saveProfileJson(profileJson: String) {
        validateProfileJson(profileJson)
        preserveCurrentProfileIfValid()
        writeAtomic(profileFile(), profileJson)
    }

    fun resetProfile() {
        profileFile().delete()
        backupFile().delete()
        tempFile().delete()
    }
}

internal interface RunnerStorageJsonValidator {
    fun validate(profileJson: String): String
}

private class AndroidRunnerStorageJsonValidator : RunnerStorageJsonValidator {

    override fun validate(profileJson: String): String {
        try {
            val value = JSONTokener(profileJson).nextValue()
            if (value !is JSONObject) {
                throw JSONException("Profile JSON must be an object.")
            }
        } catch (exception: JSONException) {
            throw IllegalArgumentException(exception.message, exception)
        }

        return profileJson
    }
}
