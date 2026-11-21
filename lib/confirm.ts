import { Alert, Platform } from 'react-native';

/** Cross-platform informational alert (uses window.alert on web, Alert.alert on native). */
export function showAlert(title: string, message: string): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.alert === 'function') {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

/** Cross-platform confirmation dialog (uses window.confirm on web, Alert.alert on native). */
export function showConfirm(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmLabel = 'Confirm',
  destructive = false
): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.confirm === 'function') {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: confirmLabel,
      style: destructive ? 'destructive' : 'default',
      onPress: onConfirm,
    },
  ]);
}
