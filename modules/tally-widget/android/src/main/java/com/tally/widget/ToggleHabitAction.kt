package com.tally.widget

import android.content.Context
import androidx.glance.GlanceId
import androidx.glance.action.ActionParameters
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.updateAll
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Completes (or un-completes) a habit straight from the home screen.
 *
 * The tap is recorded as a *pending action* rather than written to SQLite here.
 *
 * `expo-sqlite` links its own SQLite build; Android's `SQLiteDatabase` is a
 * different one. Two SQLite libraries writing the same WAL database share the
 * `-shm` index, which is explicitly unsupported and can corrupt the file — and
 * this database holds the user's entire history. Queueing costs nothing
 * visually (the widget patches its own snapshot immediately) and the app drains
 * the queue the next time it runs.
 */
class ToggleHabitAction : ActionCallback {

    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters,
    ) {
        val habitId = parameters[HABIT_ID_KEY] ?: return
        val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

        // Flip against what the widget currently shows, so repeated taps
        // alternate correctly even before the app has drained the queue.
        val nowComplete = !WidgetData.isDoneToday(context, habitId)

        PendingActions.enqueue(context, habitId, today, nowComplete)
        WidgetData.patchToggle(context, habitId, nowComplete)
        TallyWidget().updateAll(context)
    }

    companion object {
        val HABIT_ID_KEY = ActionParameters.Key<Int>("habitId")
    }
}
