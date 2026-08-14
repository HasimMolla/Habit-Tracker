package com.tally.widget

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/**
 * A durable queue of widget taps waiting to be written to the database.
 *
 * The widget cannot safely touch the app's SQLite file (see ToggleHabitAction),
 * so it records intent here and the app applies it. Entries survive reboots,
 * and the app drains the queue on every foreground.
 */
object PendingActions {
    private const val PREFS = "tally_widget"
    private const val KEY = "pending_actions"

    fun enqueue(context: Context, habitId: Int, day: String, nowComplete: Boolean) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val existing = prefs.getString(KEY, null)

        val queue = runCatching { JSONArray(existing ?: "[]") }.getOrDefault(JSONArray())

        // Collapse repeated taps on the same habit/day — only the final state
        // matters, and this keeps the queue from growing without bound.
        val filtered = JSONArray()
        for (i in 0 until queue.length()) {
            val item = queue.optJSONObject(i) ?: continue
            val sameTarget = item.optInt("habitId") == habitId && item.optString("day") == day
            if (!sameTarget) filtered.put(item)
        }

        filtered.put(
            JSONObject().apply {
                put("habitId", habitId)
                put("day", day)
                put("complete", nowComplete)
                put("at", System.currentTimeMillis())
            }
        )

        prefs.edit().putString(KEY, filtered.toString()).apply()
    }

    /** Returns the queued actions as JSON and clears them in one step. */
    fun drain(context: Context): String {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val existing = prefs.getString(KEY, null) ?: return "[]"
        prefs.edit().remove(KEY).apply()
        return existing
    }
}
