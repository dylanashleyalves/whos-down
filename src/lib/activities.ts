export const Categories = {
  sports: { label: 'Sports', emoji: '🏀' },
  gym: { label: 'Gym', emoji: '🏋️' },
  gaming: { label: 'Gaming', emoji: '🎮' },
  food: { label: 'Food', emoji: '🍜' },
  outdoors: { label: 'Outdoors', emoji: '🥾' },
  hangout: { label: 'Hangout', emoji: '🍻' },
} as const;

export type Category = keyof typeof Categories;

export type Activity = {
  id: string;
  host_id: string;
  title: string;
  category: Category;
  location: string;
  starts_at: string;
  spots: number;
  details: string | null;
  created_at: string;
};

export function formatDay(date: Date) {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatTime(date: Date) {
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
