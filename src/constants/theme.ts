/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0F1222',
    background: '#F4F5FB',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E4E7F5',
    textSecondary: '#5B6075',
  },
  dark: {
    // Midnight navy rather than flat black, so cards have something to sit on.
    text: '#FFFFFF',
    background: '#0B0E1A',
    backgroundElement: '#171B2E',
    backgroundSelected: '#262C48',
    textSecondary: '#A9AFC6',
  },
} as const;

// Brand colours: blue into purple.
export const Brand = {
  blue: '#3C87F7',
  purple: '#8B5CF6',
  pink: '#EC4899',
  gradient: 'linear-gradient(135deg, #3C87F7 0%, #8B5CF6 100%)',
  // A warmer variant for highlights like the welcome banner.
  sunset: 'linear-gradient(135deg, #3C87F7 0%, #8B5CF6 55%, #EC4899 100%)',
} as const;

// A category's colour flowing into the brand purple, for big artwork like headers.
export function colorGradient(color: string) {
  return `linear-gradient(135deg, ${color} 0%, ${Brand.purple} 100%)`;
}

// Adds transparency to a #RRGGBB colour, e.g. for tinted chip backgrounds.
export function withAlpha(hex: string, alpha: number) {
  return `${hex}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')}`;
}

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
/** The web tab bar floats over the top of the screen. */
export const TopTabInset = Platform.select({ web: 80 }) ?? 0;
export const MaxContentWidth = 800;
