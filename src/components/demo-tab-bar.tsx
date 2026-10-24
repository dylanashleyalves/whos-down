import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// A static copy of the phone's bottom tab bar, for demo screenshots taken on web
// (where the real app shows its tabs at the top instead).
export function DemoTabBar({ active }: { active: 'feed' | 'profile' }) {
  const theme = useTheme();
  const tabs = [
    { key: 'feed', label: 'Feed', icon: require('@/assets/images/tabIcons/home.png') },
    { key: 'profile', label: 'Profile', icon: require('@/assets/images/tabIcons/profile.png') },
  ] as const;

  return (
    <ThemedView style={styles.bar}>
      {tabs.map((tab) => {
        const selected = tab.key === active;
        const color = selected ? theme.text : theme.textSecondary;
        return (
          <View key={tab.key} style={styles.tab}>
            <ThemedView
              type={selected ? 'backgroundSelected' : 'background'}
              style={styles.pill}>
              <Image source={tab.icon} style={styles.icon} tintColor={color} />
            </ThemedView>
            <ThemedText type="small" style={{ color }}>
              {tab.label}
            </ThemedText>
          </View>
        );
      })}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
  },
  tab: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  pill: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.four,
  },
  icon: {
    width: 24,
    height: 24,
  },
});
