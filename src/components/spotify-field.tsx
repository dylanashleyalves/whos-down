import * as Linking from 'expo-linking';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
} from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { SocialIcon } from '@/components/social-icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { cleanHandle, isValidHandle, SOCIAL_STEPS, SOCIALS } from '@/lib/socials';

type SpotifyFieldProps = {
  value: string;
  onChange: (value: string) => void;
  inputStyle: StyleProp<TextStyle>;
};

// Spotify ids are usually a long run of random letters, so once there's one we show that
// it's added instead of the id itself.
export function SpotifyField({ value, onChange, inputStyle }: SpotifyFieldProps) {
  const theme = useTheme();
  const [typing, setTyping] = useState(false);

  if (value && !typing) {
    return (
      <View style={[inputStyle, styles.added]}>
        <ThemedText style={styles.grow} numberOfLines={1}>
          ✓ Profile added
        </ThemedText>
        <Pressable
          onPress={() => onChange('')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Remove Spotify"
          style={({ pressed }) => pressed && styles.pressed}>
          <ThemedText type="linkPrimary">Remove</ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <TextInput
      style={inputStyle}
      placeholder={SOCIALS.spotify.placeholder}
      placeholderTextColor={theme.textSecondary}
      autoCapitalize="none"
      autoCorrect={false}
      maxLength={200}
      value={value}
      onChangeText={(text) => {
        // A pasted profile link is complete, so tidy it straight away. Someone typing one
        // letter at a time isn't done yet, and it gets cleaned when they save.
        const pasted = text.length - value.length > 1;
        const handle = cleanHandle('spotify', text);
        const isProfileLink = /spotify\.com\/.*user\/|^spotify:user:/i.test(text.trim());
        if (pasted && isProfileLink && isValidHandle('spotify', handle)) {
          setTyping(false);
          onChange(handle);
        } else {
          setTyping(true);
          onChange(text);
        }
      }}
    />
  );
}

// Numbered steps for getting a profile link, with a shortcut into Spotify.
export function SpotifySteps() {
  return (
    <View style={styles.steps}>
      {SOCIAL_STEPS.spotify.map((step, index) => (
        <ThemedText key={step} type="small" themeColor="textSecondary">
          {index + 1}. {step}
        </ThemedText>
      ))}
      <PrimaryButton
        label="Open Spotify"
        variant="secondary"
        icon={<SocialIcon name="spotify" />}
        onPress={() => Linking.openURL('https://open.spotify.com')}
      />
    </View>
  );
}

// Most people have never looked for their profile link, so the steps sit right by the box.
export function SpotifyHelp() {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.steps}>
      <Pressable onPress={() => setOpen(!open)} hitSlop={8} accessibilityRole="button">
        <ThemedText type="linkPrimary">
          {open ? 'Hide the steps' : 'Where do I find my link?'}
        </ThemedText>
      </Pressable>
      {open && <SpotifySteps />}
    </View>
  );
}

const styles = StyleSheet.create({
  steps: {
    gap: Spacing.two,
  },
  added: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  grow: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
