import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/** Safe haptics — expo-haptics throws on web when native modules are missing. */
async function run(fn: () => Promise<void>): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await fn();
  } catch {
    // ignore unsupported / unlinked haptics
  }
}

export function selection(): void {
  void run(() => Haptics.selectionAsync());
}

export function impact(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium): void {
  void run(() => Haptics.impactAsync(style));
}

export function notify(
  type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Success
): void {
  void run(() => Haptics.notificationAsync(type));
}

export { Haptics };
