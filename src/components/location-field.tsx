import { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { searchPlaces, type Place } from '@/lib/places';

// Wait for a pause in typing before searching, and need a few letters first.
const PAUSE_MS = 350;
const MIN_LETTERS = 3;

type LocationFieldProps = {
  value: string;
  onChange: (value: string) => void;
  // Two-letter code, so suggestions stay in the user's country.
  country: string | null;
  inputStyle: StyleProp<TextStyle>;
};

// The "Where?" box, with place suggestions while you type. Anything typed still works,
// so a suggestion is only a shortcut.
export function LocationField({ value, onChange, country, inputStyle }: LocationFieldProps) {
  const theme = useTheme();
  const [places, setPlaces] = useState<Place[]>([]);
  // Only search after the user types, not for a saved location or a picked suggestion.
  const [typed, setTyped] = useState(false);

  useEffect(() => {
    if (!typed || value.trim().length < MIN_LETTERS) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchPlaces(value, country, controller.signal)
        .then(setPlaces)
        .catch(() => setPlaces([]));
    }, PAUSE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, country, typed]);

  const shown = typed && value.trim().length >= MIN_LETTERS ? places : [];

  return (
    <View style={styles.container}>
      <TextInput
        style={inputStyle}
        placeholder="Park, gym, café, venue or address"
        placeholderTextColor={theme.textSecondary}
        maxLength={120}
        value={value}
        onChangeText={(text) => {
          setTyped(true);
          onChange(text);
        }}
      />
      {shown.length > 0 && (
        <ThemedView type="backgroundElement" style={styles.list}>
          {shown.map((place) => (
            <Pressable
              key={place.id}
              onPress={() => {
                setTyped(false);
                setPlaces([]);
                onChange(place.label);
              }}
              style={({ pressed }) => [styles.place, pressed && styles.pressed]}>
              <ThemedText type="small">📍</ThemedText>
              <View style={styles.grow}>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {place.name}
                </ThemedText>
                {place.detail.length > 0 && (
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {place.detail}
                  </ThemedText>
                )}
              </View>
            </Pressable>
          ))}
          <ThemedText type="small" themeColor="textSecondary" style={styles.credit}>
            Suggestions © OpenStreetMap contributors
          </ThemedText>
        </ThemedView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  list: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.one,
  },
  place: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  grow: {
    flex: 1,
  },
  credit: {
    fontSize: 11,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.one,
  },
  pressed: {
    opacity: 0.6,
  },
});
