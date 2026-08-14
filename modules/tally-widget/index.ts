import { requireOptionalNativeModule } from 'expo';

declare class TallyWidgetModuleType {
  /**
   * Persists the widget snapshot and asks every placed Tally widget to redraw.
   * @param json A serialized `WidgetPayload`.
   */
  setData(json: string): Promise<void>;
  /** Forces a redraw using whatever snapshot is already stored. */
  refresh(): Promise<void>;
  /**
   * Returns taps recorded by the widget and clears them, as a JSON array of
   * `{ habitId, day, complete, at }`.
   */
  drainPendingActions(): Promise<string>;
}

/**
 * Optional on purpose: in Expo Go, or before a native build has run, the module
 * is absent. Callers still work — the widget simply doesn't update.
 */
const nativeModule = requireOptionalNativeModule<TallyWidgetModuleType>('TallyWidget');

const noop = {
  async setData() {},
  async refresh() {},
  async drainPendingActions() {
    return '[]';
  },
};

export default nativeModule ?? (noop as unknown as TallyWidgetModuleType);
