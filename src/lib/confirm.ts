import { Alert, Platform } from 'react-native';

// Asks the user to confirm a destructive action. Alert.alert does nothing on
// web, so the browser's own dialog is used there.
export function confirmAction(title: string, message: string, confirmLabel: string) {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }

  return new Promise<boolean>((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
