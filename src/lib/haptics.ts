import * as Haptics from 'expo-haptics';

/**
 * Every haptic in the app goes through here so the vocabulary stays
 * consistent: a habit completing always feels the same, everywhere.
 *
 * Haptics are best-effort — a device without a vibrator, or one where the user
 * has disabled touch feedback, simply does nothing. We swallow those rejections
 * rather than let them surface as unhandled promise warnings.
 */
function safe(run: () => Promise<void>): void {
  run().catch(() => {});
}

/** Light tick — selection changes, picking an icon or colour, drag pickup. */
export function selection(): void {
  safe(() => Haptics.selectionAsync());
}

/** Checking a habit off. The core interaction of the app. */
export function complete(): void {
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

/** Un-checking a habit — softer than completing, so it reads as an undo. */
export function uncomplete(): void {
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** Saving, or a destructive action confirming. */
export function success(): void {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export function warning(): void {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}

export function error(): void {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}

/**
 * The all-done celebration: a rising three-beat flourish, then a success
 * notification. Deliberately short — it should feel earned, not showy.
 */
export function celebrate(): void {
  safe(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await wait(90);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await wait(90);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await wait(140);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  });
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
