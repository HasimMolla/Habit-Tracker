package com.tally.widget

import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.updateAll
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Bridge between the JavaScript app and the Glance widget: JS hands over a
 * snapshot, we persist it and ask every placed widget to redraw.
 *
 * `updateAll` suspends, so these are declared as coroutine functions.
 */
class TallyWidgetModule : Module() {

    private val context
        get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

    override fun definition() = ModuleDefinition {
        Name("TallyWidget")

        AsyncFunction("setData") Coroutine { json: String ->
            WidgetData.save(context, json)
            TallyWidget().updateAll(context)
        }

        AsyncFunction("refresh") Coroutine { ->
            TallyWidget().updateAll(context)
        }

        // Drains taps the widget recorded while the app was closed.
        AsyncFunction("drainPendingActions") Coroutine { ->
            PendingActions.drain(context)
        }

        AsyncFunction("placedWidgetCount") Coroutine { ->
            GlanceAppWidgetManager(context).getGlanceIds(TallyWidget::class.java).size
        }
    }
}
