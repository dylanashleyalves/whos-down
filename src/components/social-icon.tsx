import { Image } from 'expo-image';

import type { SocialKey } from '@/lib/socials';

const ICONS = {
  instagram: require('@/assets/images/socials/instagram.png'),
  telegram: require('@/assets/images/socials/telegram.png'),
  tiktok: require('@/assets/images/socials/tiktok.png'),
  spotify: require('@/assets/images/socials/spotify.png'),
};

export function SocialIcon({ name, size = 22 }: { name: SocialKey; size?: number }) {
  return (
    <Image
      source={ICONS[name]}
      style={{ width: size, height: size }}
      contentFit="contain"
      accessibilityLabel={name}
    />
  );
}
