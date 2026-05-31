package com.ste163.runner

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Handler
import android.os.Looper
import android.os.SystemClock

import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat

import org.json.JSONObject

import kotlin.math.max
import kotlin.math.roundToLong

private data class WorkoutLevel(
    val runSeconds: Double,
    val walkSeconds: Double,
    val intervalBlockSeconds: Double,
)

private enum class WorkoutPhaseType(val label: String) {
    WARMUP("WARMUP"),
    RUN("RUN"),
    WALK("WALK"),
    COOLDOWN("COOLDOWN"),
}

private data class WorkoutInterval(
    val durationSeconds: Double,
    val type: WorkoutPhaseType,
) {
    val durationMs: Long
        get() = (durationSeconds * 1000.0).roundToLong()
}

private data class WorkoutTimerState(
    val isComplete: Boolean,
    val isPaused: Boolean,
    val isRunning: Boolean,
    val phaseDurationSeconds: Double,
    val phaseIndex: Int,
    val phaseLabel: String,
    val phaseRemainingSeconds: Double,
    val phaseType: String,
    val totalElapsedSeconds: Double,
    val totalRemainingSeconds: Double,
)

class RunnerWorkoutTimerService : Service() {

    private val mainHandler = Handler(Looper.getMainLooper())
    private var intervals: List<WorkoutInterval> = emptyList()
    private var isPaused = false
    private var isRunning = false
    private var pausedRemainingMs = 0L
    private var phaseEndElapsedMs = 0L
    private var phaseIndex = 0
    private var totalWorkoutDurationMs = 0L

    private val tickRunnable = Runnable {
        tick()
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_PAUSE -> pauseWorkoutInternal()
            ACTION_RESUME -> resumeWorkoutInternal()
            ACTION_START -> startWorkoutInternal(intent.toWorkoutLevel())
            ACTION_STOP -> stopWorkoutInternal()
        }

        return START_NOT_STICKY
    }

    override fun onBind(intent: Intent?): android.os.IBinder? = null

    override fun onDestroy() {
        cancelTick()
        super.onDestroy()
    }

    private fun startWorkoutInternal(level: WorkoutLevel?) {
        if (level == null) return

        cancelTick()
        intervals = buildWorkoutIntervals(level)
        totalWorkoutDurationMs = intervals.fold(0L) { total, interval -> total + interval.durationMs }
        phaseIndex = 0
        isPaused = false
        isRunning = true
        pausedRemainingMs = 0L
        phaseEndElapsedMs = SystemClock.elapsedRealtime() + currentInterval().durationMs

        val state = buildState()
        startForegroundNotification(state)
        emitState(state)
        scheduleTick()
    }

    private fun pauseWorkoutInternal() {
        if (!isRunning || isPaused) return

        pausedRemainingMs = max(phaseEndElapsedMs - SystemClock.elapsedRealtime(), 0L)
        isPaused = true
        cancelTick()

        val state = buildState()
        updateNotification(state)
        emitState(state)
    }

    private fun resumeWorkoutInternal() {
        if (!isRunning || !isPaused) return

        phaseEndElapsedMs = SystemClock.elapsedRealtime() + pausedRemainingMs
        pausedRemainingMs = 0L
        isPaused = false

        val state = buildState()
        updateNotification(state)
        emitState(state)
        scheduleTick()
    }

    private fun stopWorkoutInternal() {
        if (!isRunning) {
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
            return
        }

        cancelTick()
        isRunning = false
        isPaused = false
        pausedRemainingMs = 0L
        val state = buildState()

        updateNotification(state)
        emitState(state)
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun completeWorkoutInternal() {
        if (!isRunning) return

        cancelTick()
        isRunning = false
        isPaused = false
        pausedRemainingMs = 0L
        val state = buildState(isComplete = true)

        updateNotification(state)
        emitState(state)
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun tick() {
        if (!isRunning || isPaused) return

        val now = SystemClock.elapsedRealtime()
        var remainingMs = phaseEndElapsedMs - now

        while (remainingMs <= 0L && isRunning && !isPaused) {
            phaseIndex += 1

            if (phaseIndex >= intervals.size) {
                completeWorkoutInternal()
                return
            }

            phaseEndElapsedMs = now + intervals[phaseIndex].durationMs + remainingMs
            remainingMs = phaseEndElapsedMs - now
        }

        val state = buildState()
        updateNotification(state)
        emitState(state)
        scheduleTick()
    }

    private fun scheduleTick() {
        cancelTick()
        mainHandler.postDelayed(tickRunnable, 1000L)
    }

    private fun cancelTick() {
        mainHandler.removeCallbacks(tickRunnable)
    }

    private fun buildState(isComplete: Boolean = false): WorkoutTimerState {
        val currentInterval = currentInterval()
        val now = SystemClock.elapsedRealtime()
        val phaseRemainingMs = when {
            isComplete -> 0L
            isPaused -> pausedRemainingMs
            else -> max(phaseEndElapsedMs - now, 0L)
        }
        val futureRemainingMs = intervals
            .drop(phaseIndex + 1)
            .fold(0L) { total, interval -> total + interval.durationMs }
        val totalRemainingMs = if (isComplete) 0L else phaseRemainingMs + futureRemainingMs
        val totalElapsedMs = totalWorkoutDurationMs - totalRemainingMs

        return WorkoutTimerState(
            isComplete = isComplete,
            isPaused = isPaused,
            isRunning = isRunning,
            phaseDurationSeconds = currentInterval.durationSeconds,
            phaseIndex = phaseIndex,
            phaseLabel = currentInterval.type.label,
            phaseRemainingSeconds = phaseRemainingMs / 1000.0,
            phaseType = currentInterval.type.name.lowercase(),
            totalElapsedSeconds = totalElapsedMs / 1000.0,
            totalRemainingSeconds = totalRemainingMs / 1000.0,
        )
    }

    private fun currentInterval(): WorkoutInterval {
        return intervals.getOrElse(phaseIndex) {
            intervals.last()
        }
    }

    private fun emitState(state: WorkoutTimerState) {
        RunnerWorkoutTimerStateStore.save(state.toJson())
    }

    private fun startForegroundNotification(state: WorkoutTimerState) {
        val notification = buildNotification(state)
        startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
    }

    private fun updateNotification(state: WorkoutTimerState) {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(NOTIFICATION_ID, buildNotification(state))
    }

    private fun buildNotification(state: WorkoutTimerState): Notification {
        val contentIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, SplashActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentIntent(contentIntent)
            .setContentText(
                "${formatDurationLabel(state.phaseRemainingSeconds)} left · " +
                    "${formatDurationLabel(state.totalRemainingSeconds)} total left",
            )
            .setContentTitle("Runner · ${state.phaseLabel}")
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setSilent(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setSubText("Workout timer running")
            .build()
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Workout timer",
            NotificationManager.IMPORTANCE_DEFAULT,
        ).apply {
            description = "Persistent workout timer notification"
        }

        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.createNotificationChannel(channel)
    }

    private fun Intent.toWorkoutLevel(): WorkoutLevel? {
        if (action != ACTION_START) return null

        return WorkoutLevel(
            runSeconds = getDoubleExtra(EXTRA_RUN_SECONDS, 0.0),
            walkSeconds = getDoubleExtra(EXTRA_WALK_SECONDS, 0.0),
            intervalBlockSeconds = getDoubleExtra(EXTRA_INTERVAL_BLOCK_SECONDS, 0.0),
        )
    }

    private fun buildWorkoutIntervals(level: WorkoutLevel): List<WorkoutInterval> {
        val workoutIntervals = if (isGraduated(level)) {
            listOf(
                WorkoutInterval(
                    durationSeconds = level.intervalBlockSeconds,
                    type = WorkoutPhaseType.RUN,
                ),
            )
        } else {
            buildRecurringIntervals(level, level.intervalBlockSeconds, WorkoutPhaseType.RUN)
        }

        return listOf(
            WorkoutInterval(durationSeconds = 300.0, type = WorkoutPhaseType.WARMUP),
            *workoutIntervals.toTypedArray(),
            WorkoutInterval(durationSeconds = 300.0, type = WorkoutPhaseType.COOLDOWN),
        )
    }

    private fun buildRecurringIntervals(
        level: WorkoutLevel,
        remainingSeconds: Double,
        nextType: WorkoutPhaseType,
    ): List<WorkoutInterval> {
        if (remainingSeconds <= 0.0) return emptyList()

        return when (nextType) {
            WorkoutPhaseType.RUN -> {
                val durationSeconds = minOf(level.runSeconds, remainingSeconds)

                if (durationSeconds <= 0.0) {
                    emptyList()
                } else {
                    listOf(
                        WorkoutInterval(
                            durationSeconds = durationSeconds,
                            type = WorkoutPhaseType.RUN,
                        ),
                    ) + buildRecurringIntervals(
                        level,
                        remainingSeconds - durationSeconds,
                        WorkoutPhaseType.WALK,
                    )
                }
            }
            WorkoutPhaseType.WALK -> {
                val durationSeconds = minOf(level.walkSeconds, remainingSeconds)

                listOf(
                    WorkoutInterval(
                        durationSeconds = durationSeconds,
                        type = WorkoutPhaseType.WALK,
                    ),
                ) + buildRecurringIntervals(
                    level,
                    remainingSeconds - durationSeconds,
                    WorkoutPhaseType.RUN,
                )
            }
            WorkoutPhaseType.WARMUP, WorkoutPhaseType.COOLDOWN -> emptyList()
        }
    }

    private fun WorkoutTimerState.toJson(): String {
        return JSONObject()
            .put("isComplete", isComplete)
            .put("isPaused", isPaused)
            .put("isRunning", isRunning)
            .put("phaseDurationSeconds", phaseDurationSeconds)
            .put("phaseIndex", phaseIndex)
            .put("phaseLabel", phaseLabel)
            .put("phaseRemainingSeconds", phaseRemainingSeconds)
            .put("phaseType", phaseType)
            .put("totalElapsedSeconds", totalElapsedSeconds)
            .put("totalRemainingSeconds", totalRemainingSeconds)
            .toString()
    }

    private fun formatDurationLabel(seconds: Double): String {
        val roundedSeconds = max(seconds.roundToLong(), 0L)
        val minutes = roundedSeconds / 60L
        val remainder = roundedSeconds % 60L

        return if (minutes == 0L) {
            "${remainder}s"
        } else {
            "${minutes}m ${remainder}s"
        }
    }

    private fun isGraduated(level: WorkoutLevel): Boolean {
        return level.walkSeconds <= 10.0
    }

    companion object {
        private const val ACTION_PAUSE = "com.ste163.runner.action.PAUSE_WORKOUT"
        private const val ACTION_RESUME = "com.ste163.runner.action.RESUME_WORKOUT"
        private const val ACTION_START = "com.ste163.runner.action.START_WORKOUT"
        private const val ACTION_STOP = "com.ste163.runner.action.STOP_WORKOUT"
        private const val CHANNEL_ID = "runner_workout_timer"
        private const val EXTRA_INTERVAL_BLOCK_SECONDS = "intervalBlockSeconds"
        private const val EXTRA_RUN_SECONDS = "runSeconds"
        private const val EXTRA_WALK_SECONDS = "walkSeconds"
        private const val NOTIFICATION_ID = 16301

        fun startWorkout(
            context: Context,
            runSeconds: Double,
            walkSeconds: Double,
            intervalBlockSeconds: Double,
        ) {
            val intent = Intent(context, RunnerWorkoutTimerService::class.java)
                .setAction(ACTION_START)
                .putExtra(EXTRA_RUN_SECONDS, runSeconds)
                .putExtra(EXTRA_WALK_SECONDS, walkSeconds)
                .putExtra(EXTRA_INTERVAL_BLOCK_SECONDS, intervalBlockSeconds)

            ContextCompat.startForegroundService(context, intent)
        }

        fun pauseWorkout(context: Context) {
            context.startService(
                Intent(context, RunnerWorkoutTimerService::class.java)
                    .setAction(ACTION_PAUSE),
            )
        }

        fun resumeWorkout(context: Context) {
            context.startService(
                Intent(context, RunnerWorkoutTimerService::class.java)
                    .setAction(ACTION_RESUME),
            )
        }

        fun stopWorkout(context: Context) {
            context.startService(
                Intent(context, RunnerWorkoutTimerService::class.java)
                    .setAction(ACTION_STOP),
            )
        }
    }
}
