import { router } from 'expo-router';

import { ProfileForm } from '@/components/profile-form';

export default function EditProfileScreen() {
  return <ProfileForm submitLabel="Save" onSaved={() => router.back()} />;
}
