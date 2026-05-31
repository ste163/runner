package com.ste163.runner

import android.app.Activity
import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Looper
import android.os.Handler
import androidx.core.content.ContextCompat
import com.lynx.jsbridge.LynxMethod
import com.lynx.jsbridge.LynxModule
import android.provider.Settings

private object RunnerWorkoutGpsTracker {

    private val mainHandler = Handler(Looper.getMainLooper())
    private var locationManager: LocationManager? = null
    private var locationListener: LocationListener? = null
    private var distanceMeters = 0.0
    private var isTracking = false
    private var lastLocation: Location? = null

    private fun hasLocationPermission(context: Context): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_FINE_LOCATION,
        ) == PackageManager.PERMISSION_GRANTED
    }

    private fun resolveLocationManager(context: Context): LocationManager? {
        return locationManager ?: (context.applicationContext.getSystemService(
            Context.LOCATION_SERVICE,
        ) as? LocationManager)?.also {
            locationManager = it
        }
    }

    private fun isLocationEnabled(context: Context): Boolean {
        val manager = resolveLocationManager(context) ?: return false

        return try {
            manager.isProviderEnabled(LocationManager.GPS_PROVIDER)
        } catch (_: Exception) {
            false
        }
    }

    private fun ensureListener(): LocationListener {
        return locationListener ?: object : LocationListener {
            override fun onLocationChanged(location: Location) {
                val previousLocation = lastLocation

                if (previousLocation != null) {
                    distanceMeters += previousLocation.distanceTo(location)
                }

                lastLocation = location
            }
        }.also {
            locationListener = it
        }
    }

    fun state(context: Context): WorkoutGpsState {
        return buildWorkoutGpsState(
            distanceMeters = distanceMeters,
            hasPermission = hasLocationPermission(context),
            isLocationEnabled = isLocationEnabled(context),
            isTracking = isTracking,
        )
    }

    fun setTrackingEnabled(context: Context, enabled: Boolean) {
        if (enabled) {
            startTracking(context)
        } else {
            stopTracking()
        }
    }

    fun openLocationSettings(context: Context) {
        val intent = Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS)

        if (context !is Activity) {
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }

        mainHandler.post {
            context.startActivity(intent)
        }
    }

    private fun startTracking(context: Context) {
        if (!shouldStartWorkoutGpsTracking(isTracking, hasLocationPermission(context), isLocationEnabled(context))) return

        val manager = resolveLocationManager(context) ?: return

        val listener = ensureListener()

        distanceMeters = 0.0
        lastLocation = null

        try {
            manager.requestLocationUpdates(
                LocationManager.GPS_PROVIDER,
                1_000L,
                0f,
                listener,
                Looper.getMainLooper(),
            )
            isTracking = true
        } catch (_: SecurityException) {
            isTracking = false
        } catch (_: IllegalArgumentException) {
            isTracking = false
        }
    }

    private fun stopTracking() {
        if (!isTracking) {
            distanceMeters = 0.0
            lastLocation = null
            return
        }

        locationListener?.let { listener ->
            locationManager?.removeUpdates(listener)
        }
        isTracking = false
        distanceMeters = 0.0
        lastLocation = null
    }
}

class RunnerGpsModule(context: Context) : LynxModule(context) {

    @LynxMethod
    fun getWorkoutGpsState(): String {
        return RunnerWorkoutGpsTracker.state(mContext).toJson()
    }

    @LynxMethod
    fun setWorkoutTrackingEnabled(enabled: Boolean) {
        RunnerWorkoutGpsTracker.setTrackingEnabled(mContext, enabled)
    }

    @LynxMethod
    fun openLocationSettings() {
        RunnerWorkoutGpsTracker.openLocationSettings(mContext)
    }
}

private fun WorkoutGpsState.toJson(): String {
    return toJsonString()
}
