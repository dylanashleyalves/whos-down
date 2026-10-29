import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, Platform } from 'react-native';

// Light, dark, or follow the phone. Saved on the device and applied at startup.
export type ThemePreference = 'system' | 'light' | 'dark';

const THEME_KEY = 'whosdown.theme.v1';

function apply(preference: ThemePreference) {
  // The web preview follows the browser instead.
  if (Platform.OS === 'web') return;
  Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
}

export async function loadThemePreference(): Promise<ThemePreference> {
  try {
    const saved = await AsyncStorage.getItem(THEME_KEY);
    const preference = saved === 'light' || saved === 'dark' ? saved : 'system';
    apply(preference);
    return preference;
  } catch {
    return 'system';
  }
}

export async function setThemePreference(preference: ThemePreference) {
  apply(preference);
  try {
    await AsyncStorage.setItem(THEME_KEY, preference);
  } catch {
    // Still applied for this session.
  }
}
