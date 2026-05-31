package com.ste163.runner

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class RunnerStoragePickerCoordinatorTest {

    @Test
    fun registerReturnsDistinctRequestIds() {
        val firstRequestId = RunnerStoragePickerCoordinator.register { }
        val secondRequestId = RunnerStoragePickerCoordinator.register { }

        assertNotEquals(firstRequestId, secondRequestId)

        RunnerStoragePickerCoordinator.cancel(firstRequestId)
        RunnerStoragePickerCoordinator.cancel(secondRequestId)
    }

    @Test
    fun deliverInvokesRegisteredCallbackOnce() {
        val deliveredValues = mutableListOf<Any?>()
        val requestId = RunnerStoragePickerCoordinator.register { uri ->
            deliveredValues.add(uri)
        }

        RunnerStoragePickerCoordinator.deliver(requestId, null)
        RunnerStoragePickerCoordinator.deliver(requestId, null)

        assertEquals(listOf(null), deliveredValues)
    }

    @Test
    fun cancelRemovesPendingCallback() {
        val deliveredValues = mutableListOf<Any?>()
        val requestId = RunnerStoragePickerCoordinator.register { uri ->
            deliveredValues.add(uri)
        }

        RunnerStoragePickerCoordinator.cancel(requestId)
        RunnerStoragePickerCoordinator.deliver(requestId, null)

        assertTrue(deliveredValues.isEmpty())
    }
}
