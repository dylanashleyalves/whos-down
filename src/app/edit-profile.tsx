import { router } from 'expo-router';

import { ProfileForm } from '@/components/profile-form';
import { showToast } from '@/lib/toast';

export default function EditProfileScreen() {
  return (
    <ProfileForm
      submitLabel="Save"
      onSaved={() => {
        showToast('Profile saved ✓');
        router.back();
      }}
    />
  );
}
