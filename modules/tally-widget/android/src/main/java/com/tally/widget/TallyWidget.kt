package com.tally.widget

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider

/**
 * Tally's home screen widget: a consistency heat graph per habit, drawn in that
 * habit's own colour, over the launcher's Material You surface.
 *
 * Cell counts are capped deliberately — Glance renders through RemoteViews, and
 * an unbounded grid would blow past what the launcher will accept.
 */
class TallyWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val snapshot = WidgetData.load(context)

        provideContent {
            GlanceTheme {
                WidgetBody(context, snapshot)
            }
        }
    }

    @Composable
    private fun WidgetBody(context: Context, snapshot: WidgetData.Snapshot) {
        // Tapping anywhere opens the app, which starts on the Today screen.
        val openApp = actionStartActivity(
            Intent().apply {
                component = ComponentName(
                    context.packageName,
                    "${context.packageName}.MainActivity"
                )
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
        )

        Column(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(GlanceTheme.colors.widgetBackground)
                .cornerRadius(20.dp)
                .padding(14.dp)
                .clickable(openApp)
        ) {
            Header(snapshot)
            Spacer(modifier = GlanceModifier.height(10.dp))

            if (snapshot.habits.isEmpty()) {
                Text(
                    text = "Add a habit in Tally to see your graph here.",
                    style = TextStyle(
                        color = GlanceTheme.colors.onSurfaceVariant,
                        fontSize = 12.sp,
                    ),
                )
            } else {
                snapshot.habits.take(MAX_HABITS).forEachIndexed { index, habit ->
                    if (index > 0) Spacer(modifier = GlanceModifier.height(10.dp))
                    HabitGraph(habit)
                }
            }
        }
    }

    @Composable
    private fun Header(snapshot: WidgetData.Snapshot) {
        Row(
            modifier = GlanceModifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "Tally",
                style = TextStyle(
                    color = GlanceTheme.colors.onSurface,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                ),
                modifier = GlanceModifier.defaultWeight(),
            )
            if (snapshot.totalToday > 0) {
                Text(
                    text = "${snapshot.doneToday}/${snapshot.totalToday} today",
                    style = TextStyle(
                        color = GlanceTheme.colors.onSurfaceVariant,
                        fontSize = 12.sp,
                    ),
                )
            }
        }
    }

    @Composable
    private fun HabitGraph(habit: WidgetData.Habit) {
        val accent = Color(habit.color)

        Column {
            Row(
                modifier = GlanceModifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = habit.name,
                    maxLines = 1,
                    style = TextStyle(
                        color = GlanceTheme.colors.onSurface,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                    ),
                    modifier = GlanceModifier.defaultWeight(),
                )
                if (habit.streak > 0) {
                    Text(
                        text = "${habit.streak}d",
                        style = TextStyle(color = ColorProvider(accent), fontSize = 11.sp),
                    )
                }
            }

            Spacer(modifier = GlanceModifier.height(5.dp))
            HeatGrid(habit.cells, accent)
        }
    }

    /**
     * Columns are weeks, rows are weekdays — the same orientation as the graph
     * inside the app.
     *
     * Index 0 of `cells` is always a Sunday, so column boundaries fall on
     * multiples of seven. We trim to whole columns rather than to a raw cell
     * count, otherwise the weekday rows would shear by a day.
     *
     * Spacing is done with over-sized slots rather than `Spacer` children on
     * purpose: a Glance container renders at most ten children, and interleaved
     * spacers would push a seven-row column to thirteen — silently dropping the
     * last two rows and columns.
     */
    @Composable
    private fun HeatGrid(cells: String, accent: Color) {
        if (cells.isEmpty()) return

        val total = cells.length
        val totalColumns = (total + 6) / 7
        val firstColumn = maxOf(0, totalColumns - WEEKS)
        val columns = totalColumns - firstColumn

        Row {
            for (column in 0 until columns) {
                Column {
                    for (day in 0 until 7) {
                        val index = (firstColumn + column) * 7 + day
                        // Days after today sit past the end of the string.
                        val cell = if (index < total) cells[index] else EMPTY_CELL

                        // Outer box is the cell plus its gap; the inner box is
                        // the visible square, pinned top-start.
                        Box(modifier = GlanceModifier.size(CELL + GAP)) {
                            Box(
                                modifier = GlanceModifier
                                    .size(CELL)
                                    .cornerRadius(2.dp)
                                    .background(cellColor(cell, accent))
                            ) {}
                        }
                    }
                }
            }
        }
    }

    private fun cellColor(cell: Char, accent: Color): Color = when (cell) {
        '2' -> accent
        '1' -> accent.copy(alpha = 0.22f)
        else -> Color(0x14808080)
    }

    private companion object {
        const val MAX_HABITS = 3
        // Ten is the per-container child ceiling, so ten columns is the widest
        // grid a single Row can hold.
        const val WEEKS = 10
        const val EMPTY_CELL = '0'
        val CELL = 9.dp
        val GAP = 2.dp
    }
}
