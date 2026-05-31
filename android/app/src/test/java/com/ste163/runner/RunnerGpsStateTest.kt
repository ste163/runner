package com.ste163.runner

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mockito.Mockito

class RunnerGpsStateTest {

    @Test
    fun buildsWorkoutGpsStateFromMeters() {
        val state = buildWorkoutGpsState(
            distanceMeters = 804.672,
            hasPermission = true,
            isLocationEnabled = true,
            isTracking = true,
        )

        assertEquals(0.5, state.distanceMiles, 0.000001)
        assertTrue(state.hasPermission)
        assertTrue(state.isLocationEnabled)
        assertTrue(state.isTracking)
    }

    @Test
    fun serializesWorkoutGpsStateToJson() {
        val state = buildWorkoutGpsState(
            distanceMeters = 3218.688,
            hasPermission = false,
            isLocationEnabled = false,
            isTracking = false,
        )

        val expectedJson = """{"distanceMiles":2.0,"hasPermission":false,"isLocationEnabled":false,"isTracking":false}"""

        Mockito.mockConstruction(JSONObject::class.java) { mock, _ ->
            Mockito.`when`(mock.put("distanceMiles", state.distanceMiles)).thenReturn(mock)
            Mockito.`when`(mock.put("hasPermission", state.hasPermission)).thenReturn(mock)
            Mockito.`when`(mock.put("isLocationEnabled", state.isLocationEnabled)).thenReturn(mock)
            Mockito.`when`(mock.put("isTracking", state.isTracking)).thenReturn(mock)
            Mockito.`when`(mock.toString()).thenReturn(expectedJson)
        }.use { construction ->
            assertEquals(expectedJson, state.toJsonString())

            val json = construction.constructed().single()
            Mockito.verify(json).put("distanceMiles", state.distanceMiles)
            Mockito.verify(json).put("hasPermission", state.hasPermission)
            Mockito.verify(json).put("isLocationEnabled", state.isLocationEnabled)
            Mockito.verify(json).put("isTracking", state.isTracking)
        }
    }

    @Test
    fun startsTrackingOnlyWhenPermissionAndGpsAreEnabled() {
        assertTrue(
            shouldStartWorkoutGpsTracking(
                isTracking = false,
                hasPermission = true,
                isLocationEnabled = true,
            ),
        )
        assertFalse(
            shouldStartWorkoutGpsTracking(
                isTracking = true,
                hasPermission = true,
                isLocationEnabled = true,
            ),
        )
        assertFalse(
            shouldStartWorkoutGpsTracking(
                isTracking = false,
                hasPermission = false,
                isLocationEnabled = true,
            ),
        )
        assertFalse(
            shouldStartWorkoutGpsTracking(
                isTracking = false,
                hasPermission = true,
                isLocationEnabled = false,
            ),
        )
    }
}
