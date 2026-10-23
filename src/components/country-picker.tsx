import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { findCountry, searchCountries } from '@/lib/countries';

const MAX_RESULTS = 8;

type CountryPickerProps = {
  value: string | null;
  onChange: (code: string) => void;
};

// Type-to-search country picker. Shows the chosen country, or a search box.
export function CountryPicker({ value, onChange }: CountryPickerProps) {
  const theme = useTheme();
  const selected = findCountry(value);
  const [searching, setSearching] = useState(!selected);
  const [query, setQuery] = useState('');
  const results = searchCountries(query).slice(0, MAX_RESULTS);

  if (selected && !searching) {
    return (
      <ThemedView type="backgroundElement" style={styles.selected}>
        <ThemedText>
          {selected.flag} {selected.name}
        </ThemedText>
        <Pressable onPress={() => setSearching(true)}>
          <ThemedText type="linkPrimary">Change</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <View style={styles.search}>
      <TextInput
        style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        placeholder="Search for your country"
        placeholderTextColor={theme.textSecondary}
        autoCorrect={false}
        value={query}
        onChangeText={setQuery}
      />
      {results.map((country) => (
        <Pressable
          key={country.code}
          onPress={() => {
            onChange(country.code);
            setQuery('');
            setSearching(false);
          }}
          style={({ pressed }) => [styles.result, pressed && styles.pressed]}>
          <ThemedText>
            {country.flag} {country.name}
          </ThemedText>
        </Pressable>
      ))}
      {query.trim() !== '' && results.length === 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          No country matches &quot;{query.trim()}&quot;.
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  selected: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  search: {
    gap: Spacing.one,
  },
  input: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    fontSize: 16,
  },
  result: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  pressed: {
    opacity: 0.6,
  },
});
