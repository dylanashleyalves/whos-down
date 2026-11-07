import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ArrangeSections } from '@/components/arrange-sections';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import {
  DEFAULT_SECTION_ORDER,
  hiddenSections,
  sectionOrder,
  type SectionKey,
} from '@/lib/profile-layout';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/lib/toast';
import { useAuth } from '@/providers/auth-provider';

export default function ArrangeProfileScreen() {
  const { profile, refreshProfile } = useAuth();
  const [order, setOrder] = useState(() => sectionOrder(profile));
  const [hidden, setHidden] = useState(() => hiddenSections(profile));
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(key: SectionKey) {
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function save() {
    if (!profile) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase
      .from('profiles')
      .update({ section_order: order, hidden_sections: [...hidden] })
      .eq('id', profile.id);
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    await refreshProfile();
    showToast('✨ Profile arranged');
    router.back();
  }

  return (
    // Its own gesture root, since a modal sits outside the app's main one on Android.
    <GestureHandlerRootView style={styles.root}>
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} scrollEnabled={!dragging}>
          <ThemedText type="small" themeColor="textSecondary">
            Hold ≡ and drag to put what matters most to you first. Use the switches to hide what you
            don&apos;t want. Your photo, name and buttons always stay at the top.
          </ThemedText>

          <ArrangeSections
            order={order}
            hidden={hidden}
            onReorder={setOrder}
            onToggle={toggle}
            onDragging={setDragging}
          />

          {error && (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          )}

          <PrimaryButton label="Save" busy={busy} onPress={save} />

          <Pressable
            onPress={() => {
              setOrder(DEFAULT_SECTION_ORDER);
              setHidden(new Set());
            }}
            style={({ pressed }) => [styles.reset, pressed && styles.pressed]}>
            <ThemedText type="small" themeColor="textSecondary">
              Reset to default
            </ThemedText>
          </Pressable>
        </ScrollView>
      </ThemedView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  error: {
    color: '#e5484d',
    textAlign: 'center',
  },
  reset: {
    alignSelf: 'center',
    padding: Spacing.two,
  },
  pressed: {
    opacity: 0.6,
  },
});
