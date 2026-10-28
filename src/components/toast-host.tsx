import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import { setToastListener } from '@/lib/toast';

const SHOW_FOR_MS = 3000;

// Shows messages from showToast() near the bottom of the screen for a few seconds.
export function ToastHost() {
  const insets = useSafeAreaInsets();
  // A counter in the key replays the animation when the same message shows twice.
  const [toast, setToast] = useState<{ message: string; key: number } | null>(null);

  useEffect(() => {
    setToastListener((message) =>
      setToast((current) => ({ message, key: (current?.key ?? 0) + 1 }))
    );
    return () => setToastListener(null);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), SHOW_FOR_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <View pointerEvents="none" style={[styles.wrapper, { bottom: insets.bottom + 96 }]}>
      {toast && (
        <Animated.View
          key={toast.key}
          entering={FadeInDown.springify()}
          exiting={FadeOutDown}
          style={styles.toast}>
          <ThemedText type="smallBold" style={styles.text}>
            {toast.message}
          </ThemedText>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    alignItems: 'center',
    zIndex: 3000,
  },
  toast: {
    maxWidth: MaxContentWidth,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: 999,
    backgroundColor: Brand.purple,
    backgroundImage: Brand.gradient,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  text: {
    color: '#ffffff',
    textAlign: 'center',
  },
});
