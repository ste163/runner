package com.ste163.runner

import org.json.JSONObject

private const val METERS_PER_MILE = 1609.344

internal data class WorkoutGpsState(
    val distanceMiles: Double,
    val hasPermission: Boolean,
    val isLocationEnabled: Boolean,
    val isTracking: Boolean,
)

internal fun buildWorkoutGpsState(
    distanceMeters: Double,
    hasPermission: Boolean,
    isLocationEnabled: Boolean,
    isTracking: Boolean,
): WorkoutGpsState {
    return WorkoutGpsState(
        distanceMiles = distanceMeters / METERS_PER_MILE,
        hasPermission = hasPermission,
        isLocationEnabled = isLocationEnabled,
        isTracking = isTracking,
    )
}

internal fun shouldStartWorkoutGpsTracking(
    isTracking: Boolean,
    hasPermission: Boolean,
    isLocationEnabled: Boolean,
): Boolean {
    return !isTracking && hasPermission && isLocationEnabled
}

internal fun WorkoutGpsState.toJsonString(): String {
    return JSONObject()
        .put("distanceMiles", distanceMiles)
        .put("hasPermission", hasPermission)
        .put("isLocationEnabled", isLocationEnabled)
        .put("isTracking", isTracking)
        .toString()
}
