package com.ste163.runner

internal enum class SplashPermissionStep {
    REQUEST_NOTIFICATION,
    REQUEST_LOCATION,
    LAUNCH_APP,
}

internal fun nextSplashPermissionStep(
    hasNotificationPermission: Boolean,
    hasLocationPermission: Boolean,
): SplashPermissionStep {
    return when {
        !hasNotificationPermission -> SplashPermissionStep.REQUEST_NOTIFICATION
        !hasLocationPermission -> SplashPermissionStep.REQUEST_LOCATION
        else -> SplashPermissionStep.LAUNCH_APP
    }
}
