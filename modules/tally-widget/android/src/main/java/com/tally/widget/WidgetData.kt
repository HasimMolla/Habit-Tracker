package com.tally.widget

import android.content.Context
import android.graphics.Color
import org.json.JSONObject

/**
 * The snapshot the app hands over, and the shared-preferences file both the
 * Expo module and the Glance widget read. Same process, same app, so plain
 * SharedPreferences is enough — no ContentProvider needed.
 */
object WidgetData {
    private const val PREFS = "tally_widget"
    private const val KEY_PAYLOAD = "payload"

    fun save(context: Context, json: String) {
        context
            .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_PAYLOAD, json)
            .apply()
    }

    /**
     * Applies a single toggle to the stored snapshot in place.
     *
     * Cheaper and far less code than recomputing the whole payload in Kotlin,
     * and it keeps one source of truth for the heavy lifting: the app rewrites
     * the full snapshot the next time it runs.
     */
    fun patchToggle(context: Context, habitId: Int, nowComplete: Boolean) {
        val raw = context
            .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_PAYLOAD, null)
            ?: return

        runCatching {
            val root = JSONObject(raw)
            val habits = root.optJSONArray("habits") ?: return

            for (i in 0 until habits.length()) {
                val habit = habits.getJSONObject(i)
                if (habit.optInt("id") != habitId) continue

                val cells = habit.optString("cells")
                if (cells.isEmpty()) return

                // The final character is today.
                val patched = cells.dropLast(1) + if (nowComplete) '2' else '1'
                habit.put("cells", patched)
                habit.put("streak", trailingStreak(patched))
                habit.put("doneToday", nowComplete)

                val delta = if (nowComplete) 1 else -1
                val done = (root.optInt("doneToday") + delta)
                    .coerceIn(0, root.optInt("totalToday"))
                root.put("doneToday", done)
                break
            }

            save(context, root.toString())
        }
    }

    /**
     * Streak read off the encoded cells: walk back over scheduled days,
     * skipping unscheduled ones, treating an unfinished today as a grace day.
     * Mirrors `trailingStreak` in `src/lib/widget.ts`.
     */
    private fun trailingStreak(cells: String): Int {
        var index = cells.length - 1
        if (index >= 0 && cells[index] == '1') index -= 1

        var streak = 0
        while (index >= 0) {
            when (cells[index]) {
                '0' -> {}
                '1' -> return streak
                else -> streak += 1
            }
            index -= 1
        }
        return streak
    }

    /** Whether the stored snapshot currently shows this habit as done today. */
    fun isDoneToday(context: Context, habitId: Int): Boolean {
        val raw = context
            .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_PAYLOAD, null)
            ?: return false

        return runCatching {
            val habits = JSONObject(raw).optJSONArray("habits") ?: return false
            for (i in 0 until habits.length()) {
                val habit = habits.getJSONObject(i)
                if (habit.optInt("id") == habitId) return habit.optBoolean("doneToday")
            }
            false
        }.getOrDefault(false)
    }

    fun load(context: Context): Snapshot {
        val raw = context
            .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_PAYLOAD, null)
            ?: return Snapshot.EMPTY

        return runCatching { parse(raw) }.getOrDefault(Snapshot.EMPTY)
    }

    private fun parse(raw: String): Snapshot {
        val root = JSONObject(raw)
        val habitsJson = root.optJSONArray("habits")
        val habits = buildList {
            for (i in 0 until (habitsJson?.length() ?: 0)) {
                val item = habitsJson!!.getJSONObject(i)
                add(
                    Habit(
                        id = item.optInt("id"),
                        name = item.optString("name"),
                        color = parseColor(item.optString("color")),
                        cells = item.optString("cells"),
                        streak = item.optInt("streak"),
                        doneToday = item.optBoolean("doneToday"),
                    )
                )
            }
        }

        return Snapshot(
            habits = habits,
            doneToday = root.optInt("doneToday"),
            totalToday = root.optInt("totalToday"),
            todayWeekday = root.optInt("todayWeekday"),
            hasData = true,
        )
    }

    /** Falls back to the app's accent if a colour ever fails to parse. */
    private fun parseColor(value: String): Int =
        runCatching { Color.parseColor(value) }.getOrDefault(0xFF7C6BF0.toInt())

    data class Habit(
        val id: Int,
        val name: String,
        val color: Int,
        /** '2' done, '1' scheduled but missed, '0' not scheduled — oldest first. */
        val cells: String,
        val streak: Int,
        val doneToday: Boolean,
    )

    data class Snapshot(
        val habits: List<Habit>,
        val doneToday: Int,
        val totalToday: Int,
        val todayWeekday: Int,
        val hasData: Boolean,
    ) {
        companion object {
            val EMPTY = Snapshot(emptyList(), 0, 0, 0, false)
        }
    }
}
