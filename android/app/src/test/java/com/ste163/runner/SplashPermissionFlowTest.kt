package com.ste163.runner

import org.junit.Assert.assertEquals
import org.junit.Test

class SplashPermissionFlowTest {

    @Test
    fun requestsNotificationFirstWhenMissing() {
        assertEquals(
            SplashPermissionStep.REQUEST_NOTIFICATION,
            nextSplashPermissionStep(
                hasNotificationPermission = false,
                hasLocationPermission = false,
            ),
        )
    }

    @Test
    fun requestsLocationAfterNotificationPermissionIsGranted() {
        assertEquals(
            SplashPermissionStep.REQUEST_LOCATION,
            nextSplashPermissionStep(
                hasNotificationPermission = true,
                hasLocationPermission = false,
            ),
        )
    }

    @Test
    fun launchesAppOnlyWhenBothPermissionsAreGranted() {
        assertEquals(
            SplashPermissionStep.LAUNCH_APP,
            nextSplashPermissionStep(
                hasNotificationPermission = true,
                hasLocationPermission = true,
            ),
        )
    }
}
