package com.ste163.runner

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.After
import org.junit.Before
import org.junit.Test

import java.io.File
import java.nio.file.Files

class RunnerStorageFileStoreTest {

    private lateinit var baseDirectory: File
    private lateinit var validator: RecordingJsonValidator
    private lateinit var store: RunnerStorageFileStore

    @Before
    fun setUp() {
        baseDirectory = Files.createTempDirectory("runner-storage-test").toFile()
        validator = RecordingJsonValidator()
        store = RunnerStorageFileStore(baseDirectory, validator)
    }

    @After
    fun tearDown() {
        baseDirectory.deleteRecursively()
    }

    private fun profileFile(baseDirectory: File): File {
        return File(baseDirectory, RunnerStorageFileStore.PROFILE_FILE_NAME)
    }

    private fun backupFile(baseDirectory: File): File {
        return File(baseDirectory, RunnerStorageFileStore.BACKUP_FILE_NAME)
    }

    private fun tempFile(baseDirectory: File): File {
        return File(baseDirectory, RunnerStorageFileStore.TEMP_FILE_NAME)
    }

    @Test
    fun loadProfileJsonReturnsNullWhenNoFilesExist() {
        assertNull(store.loadProfileJson())
    }

    @Test
    fun saveProfileJsonWritesMainFileAndBackupCopy() {
        val originalJson = """{"schemaVersion":1,"level":{"runSeconds":30}}"""
        profileFile(baseDirectory).writeText(originalJson, Charsets.UTF_8)

        val updatedJson = """{"schemaVersion":1,"level":{"runSeconds":45}}"""
        store.saveProfileJson(updatedJson)

        assertEquals(updatedJson, profileFile(baseDirectory).readText(Charsets.UTF_8))
        assertEquals(originalJson, backupFile(baseDirectory).readText(Charsets.UTF_8))
        assertFalse(tempFile(baseDirectory).exists())
        assertEquals(listOf(updatedJson, originalJson), validator.validatedInputs)
    }

    @Test
    fun loadProfileJsonRecoversMainFileFromBackup() {
        val backupJson = """{"schemaVersion":1,"level":{"runSeconds":60}}"""
        validator.reject("not-json")
        backupFile(baseDirectory).writeText(backupJson, Charsets.UTF_8)
        profileFile(baseDirectory).writeText("not-json", Charsets.UTF_8)

        assertEquals(backupJson, store.loadProfileJson())
        assertEquals(backupJson, profileFile(baseDirectory).readText(Charsets.UTF_8))
        assertTrue(backupFile(baseDirectory).exists())
        assertEquals(listOf("not-json", backupJson), validator.validatedInputs)
    }

    @Test
    fun loadProfileJsonThrowsWhenFilesExistButAreInvalid() {
        validator.reject("not-json")
        validator.reject("also-not-json")
        profileFile(baseDirectory).writeText("not-json", Charsets.UTF_8)
        backupFile(baseDirectory).writeText("also-not-json", Charsets.UTF_8)

        assertThrows(IllegalStateException::class.java) {
            store.loadProfileJson()
        }
        assertEquals(listOf("not-json", "also-not-json"), validator.validatedInputs)
    }

    @Test
    fun resetProfileDeletesAllStorageFiles() {
        profileFile(baseDirectory).writeText("""{"schemaVersion":1}""", Charsets.UTF_8)
        backupFile(baseDirectory).writeText("""{"schemaVersion":1}""", Charsets.UTF_8)
        tempFile(baseDirectory).writeText("""{}""", Charsets.UTF_8)

        store.resetProfile()

        assertFalse(profileFile(baseDirectory).exists())
        assertFalse(backupFile(baseDirectory).exists())
        assertFalse(tempFile(baseDirectory).exists())
    }

    @Test
    fun saveProfileJsonRejectsInvalidJson() {
        validator.reject("not-json")

        assertThrows(IllegalArgumentException::class.java) {
            store.saveProfileJson("not-json")
        }
        assertFalse(profileFile(baseDirectory).exists())
        assertTrue(validator.validatedInputs.contains("not-json"))
    }
}

private class RecordingJsonValidator : RunnerStorageJsonValidator {

    private val rejectedInputs = mutableSetOf<String>()
    val validatedInputs = mutableListOf<String>()

    fun reject(profileJson: String) {
        rejectedInputs.add(profileJson)
    }

    override fun validate(profileJson: String): String {
        validatedInputs.add(profileJson)

        if (rejectedInputs.contains(profileJson)) {
            throw IllegalArgumentException("Invalid JSON")
        }

        return profileJson
    }
}
