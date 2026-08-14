# Tally

A minimal habit tracker for Android. Everything lives on the device — no
account, no sync, no tracking, nothing to pay for.

## What it does

- **Today** — the habits scheduled for today as a checklist. Tapping one
  completes it with haptic feedback and fills its progress bar.
- **Habits** — create, edit, delete, and long-press to drag into any order.
  Each habit has a name, a Material Symbol, an accent colour, a schedule
  (every day or specific weekdays), and an optional reminder time.
- **History** — a GitHub-style consistency graph per habit, drawn in that
  habit's colour, plus current streak, best streak, completion rate and total.
- **Settings** — notification permission state, queued reminder count, a test
  notification, sample data seeding, and a full reset.
- **Home screen widget** — the consistency graph on your launcher, updating as
  soon as you complete or add a habit. Tapping it opens the app on Today.
- **Habit detail** — tap any habit for its own page: streak, best streak,
  30-day rate, and the full history graph.
- **Backfill** — turn on Edit on the detail screen and tap any past day to mark
  it done or undo it. A missed day is never permanently lost.
- **Counter habits** — give a habit a daily target ("8 glasses") and it counts
  up instead of being a single tick.
- **Archive** — retire a habit without destroying its history.
- **Undo** — a brief snackbar after every completion, for mis-taps.
- **Celebration** — finishing everything scheduled for the day plays a short
  animated flourish with a rising haptic pattern. It's deliberately brief.

## Running it

**Tally cannot run in Expo Go.** It contains a custom native module (the Glance
widget, in Kotlin), and Expo Go can only load the modules compiled into it. You
need a development build instead — the same experience, including hot reload,
but built from this project.

### Getting the app onto a phone

Cloud build, no cable and nothing compiled locally:

```bash
npx eas login          # once
npm run build:apk      # returns a QR code / install link
```

Or build locally over USB, if you prefer:

```bash
npm run android        # add --device for a physical phone
```

### Day to day

Once the app is installed, native rebuilds are rarely needed:

```bash
npm start              # expo start --dev-client
```

Phone and computer on the same network. Edits to anything in `app/` or `src/`
hot-reload immediately.

Rebuild only when native code changes: a new native dependency, an `app.json`
plugin or permission change, or an edit to `modules/tally-widget`.

### Scripts

| Script | Purpose |
| --- | --- |
| `npm start` | Metro for the development build |
| `npm run android` | Local native build + install |
| `npm run build:apk` | EAS cloud build, installable APK |
| `npm run build:dev` | EAS cloud build of the development client |
| `npm run typecheck` | TypeScript, no emit |
| `npm run doctor` | Dependency and config pre-flight |
| `npm run icons` | Regenerate the icon set |
| `npm run clean` | Delete native build output (see below) |

### A note on `legacy-peer-deps`

`.npmrc` sets `legacy-peer-deps=true`, because `react-dom` — an optional peer of
several Expo packages, unused in this Android-only app — declares a `react`
range that conflicts with the version Expo pins. Without the flag, `npm install`
fails outright, locally and on EAS.

The flag has a sharp edge: npm stops enforcing peer dependencies, so packages
present *only* as peers get pruned on the next install. That already cost two
outages here — `react-native-worklets` (peer of Reanimated) broke the JS bundle,
and `expo-font` (peer of `expo-symbols`) would have crashed the release build
with no warning at build time.

Both are now listed explicitly in `package.json` so they cannot be pruned. If
you add a package that pulls in native peers, declare them explicitly too, and
run `npm run doctor` — it catches exactly this. `build:apk` runs it for you.

### Disk usage

A native Android build compiles React Native, Reanimated and expo-modules-core
from C++ source, once per CPU architecture. That output lands in `android/` and
in `node_modules/*/android/{build,.cxx}`, and can reach several GB.

All of it is disposable — an installed app is independent of it, and `npm start`
does not need it:

```bash
npm run clean
```

Roughly 500 MB idle, a few GB after a local build, back to 500 MB on demand.
EAS builds avoid the local cost entirely.

## How it's put together

| Concern | Approach |
| --- | --- |
| Colour | `useMaterialColors()` from `@expo/ui/jetpack-compose` — real Material You tokens derived from the user's wallpaper on Android 12+, falling back to the Material 3 baseline. Dark mode is free. A habit's accent is the only hard-coded colour. |
| Navigation | Expo Router with `NativeTabs` (a genuine Material 3 bottom navigation bar) and `Stack.Protected` gating onboarding. |
| Icons | `expo-symbols`, which renders Material Symbols on Android. 40 curated habit symbols in four categories, picked from a chip-filtered grid. |
| Storage | `expo-sqlite` with versioned migrations in `src/db/database.ts`. |
| Animation | Reanimated 4 for the checklist, celebration and drag-to-reorder; Gesture Handler for the drag itself. |
| Widget | A local Expo module (`modules/tally-widget`) wrapping a Jetpack Glance `GlanceAppWidget`. |

### Dates

Every day is stored as a local `YYYY-MM-DD` key, never a timestamp. A habit
completed at 11pm belongs to that day rather than the next UTC one. All of the
helpers live in `src/lib/dates.ts`.

### Streaks

Streaks only count *scheduled* days, so a Mon/Wed/Fri habit isn't broken by
Tuesday. Today is a grace day: an unfinished habit doesn't break the streak
until the day is over. See `src/db/stats.ts`.

### Why the widget cannot write to the database

The widget can tick a habit off from the home screen, but it does **not** write
to SQLite. `expo-sqlite` links its own SQLite build while Android's
`SQLiteDatabase` is a different one, and two SQLite libraries writing the same
WAL database share the `-shm` index — unsupported, and capable of corrupting the
file that holds every habit ever logged.

Instead the widget appends the tap to a durable queue in `SharedPreferences`
(`PendingActions.kt`) and patches its own snapshot so the tick appears
instantly. `HabitsProvider` drains that queue on mount and on every return to
the foreground, applying each action through the normal data layer. Repeated
taps on the same habit and day collapse to their final state, so the queue
cannot grow without bound.

### The widget data path

`HabitsProvider` is the single source of truth. Any change to habits or
completions triggers `syncWidget()`, which encodes a compact snapshot — one
character per day, `2` done / `1` scheduled-but-missed / `0` not scheduled —
and hands it to the native module. That writes it to `SharedPreferences` and
calls `updateAll`, which makes Glance recompose. No screen syncs the widget
itself.

## Project layout

```
app/                    Expo Router routes
  (tabs)/               Today, Habits, History, Settings
  habit/                Create and edit (modal), detail/[id] (pushed page)
  onboarding.tsx
src/
  db/                   Schema, migrations, queries, stats, sample data
  lib/                  Dates, haptics, notifications, icons, widget bridge
  state/                HabitsProvider, OnboardingProvider, ProfileProvider
  theme/                Material You tokens, spacing, habit accents
  ui/                   Shared components
modules/tally-widget/   Local Expo module + Jetpack Glance widget (Kotlin)
scripts/generate-icons.py   Regenerates the icon set
```

## Icons

The app mark is a tally group — four upright strokes crossed by a diagonal
fifth. Regenerate every size with:

```bash
python3 scripts/generate-icons.py
```
