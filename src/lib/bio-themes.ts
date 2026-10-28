import { Categories, type Category } from '@/lib/activities';

export type BioTheme = { emoji: string; color: string };

// Things people often mention in their bio, and the art and colour each one gets on
// their profile cover. Words are matched whole and case-insensitively, plurals included.
const THEMES: { words: string[]; theme: BioTheme }[] = [
  { words: ['basketball', 'ball', 'hoops', 'nba'], theme: { emoji: '🏀', color: '#F97316' } },
  { words: ['football', 'soccer', 'futsal'], theme: { emoji: '⚽', color: '#22C55E' } },
  { words: ['badminton'], theme: { emoji: '🏸', color: '#14B8A6' } },
  { words: ['tennis', 'pickleball'], theme: { emoji: '🎾', color: '#A3E635' } },
  { words: ['volleyball'], theme: { emoji: '🏐', color: '#FACC15' } },
  {
    words: ['run', 'running', 'runner', 'marathon', 'jog', 'jogging'],
    theme: { emoji: '🏃', color: '#06B6D4' },
  },
  {
    words: ['cycling', 'cycle', 'bike', 'biking', 'cyclist'],
    theme: { emoji: '🚴', color: '#84CC16' },
  },
  { words: ['swim', 'swimming', 'swimmer'], theme: { emoji: '🏊', color: '#0EA5E9' } },
  { words: ['surf', 'surfing', 'beach', 'sea', 'ocean'], theme: { emoji: '🌊', color: '#0EA5E9' } },
  {
    words: ['gym', 'lifting', 'lift', 'weights', 'powerlifting', 'bodybuilding'],
    theme: { emoji: '🏋️', color: '#EF4444' },
  },
  { words: ['climbing', 'bouldering', 'climb'], theme: { emoji: '🧗', color: '#F59E0B' } },
  { words: ['yoga', 'pilates', 'meditation'], theme: { emoji: '🧘', color: '#A78BFA' } },
  {
    words: ['boxing', 'mma', 'muaythai', 'bjj', 'martial'],
    theme: { emoji: '🥊', color: '#DC2626' },
  },
  {
    words: ['hike', 'hiking', 'trek', 'trekking', 'outdoors', 'nature', 'camping'],
    theme: { emoji: '🥾', color: '#16A34A' },
  },
  {
    words: ['gaming', 'gamer', 'games', 'valorant', 'fortnite', 'minecraft', 'league'],
    theme: { emoji: '🎮', color: '#8B5CF6' },
  },
  { words: ['anime', 'manga'], theme: { emoji: '🍥', color: '#F472B6' } },
  { words: ['chess'], theme: { emoji: '♟️', color: '#64748B' } },
  {
    words: ['music', 'concerts', 'concert', 'gigs', 'festival', 'festivals'],
    theme: { emoji: '🎧', color: '#D946EF' },
  },
  { words: ['guitar', 'band', 'jamming'], theme: { emoji: '🎸', color: '#E11D48' } },
  { words: ['piano'], theme: { emoji: '🎹', color: '#6366F1' } },
  { words: ['singing', 'karaoke', 'sing'], theme: { emoji: '🎤', color: '#EC4899' } },
  { words: ['dance', 'dancing'], theme: { emoji: '💃', color: '#F43F5E' } },
  {
    words: ['movies', 'movie', 'films', 'film', 'cinema', 'netflix'],
    theme: { emoji: '🎬', color: '#F59E0B' },
  },
  { words: ['reading', 'books', 'book', 'novels'], theme: { emoji: '📚', color: '#B45309' } },
  { words: ['art', 'drawing', 'painting', 'sketching'], theme: { emoji: '🎨', color: '#EC4899' } },
  { words: ['photography', 'photos', 'camera'], theme: { emoji: '📷', color: '#64748B' } },
  { words: ['coding', 'code', 'programming', 'tech'], theme: { emoji: '💻', color: '#3B82F6' } },
  {
    words: ['travel', 'travelling', 'traveling', 'trips'],
    theme: { emoji: '✈️', color: '#0EA5E9' },
  },
  { words: ['coffee', 'cafe', 'cafes', 'latte'], theme: { emoji: '☕', color: '#A16207' } },
  { words: ['bubble', 'boba', 'bbt'], theme: { emoji: '🧋', color: '#C2410C' } },
  {
    words: ['food', 'foodie', 'eating', 'supper', 'hawker', 'ramen', 'noodles'],
    theme: { emoji: '🍜', color: '#F59E0B' },
  },
  { words: ['cooking', 'cook', 'baking', 'bake'], theme: { emoji: '🍳', color: '#FB923C' } },
  { words: ['pizza'], theme: { emoji: '🍕', color: '#EF4444' } },
  { words: ['sushi'], theme: { emoji: '🍣', color: '#FB7185' } },
  { words: ['beer', 'beers', 'drinks', 'bars', 'pub'], theme: { emoji: '🍻', color: '#EAB308' } },
  { words: ['dogs', 'dog', 'puppy', 'puppies'], theme: { emoji: '🐶', color: '#D97706' } },
  { words: ['cats', 'cat', 'kitten', 'kittens'], theme: { emoji: '🐱', color: '#F472B6' } },
  {
    words: ['cars', 'car', 'racing', 'f1', 'motorsport'],
    theme: { emoji: '🏎️', color: '#DC2626' },
  },
  { words: ['fishing'], theme: { emoji: '🎣', color: '#0891B2' } },
  { words: ['golf'], theme: { emoji: '⛳', color: '#16A34A' } },
  { words: ['skateboarding', 'skating', 'skate'], theme: { emoji: '🛹', color: '#F97316' } },
  { words: ['stars', 'astronomy', 'space'], theme: { emoji: '🌌', color: '#4F46E5' } },
];

function escape(word: string) {
  return word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const MATCHERS = THEMES.map(({ words, theme }) => ({
  // Whole words, with an optional plural "s".
  pattern: new RegExp(`\\b(${words.map(escape).join('|')})s?\\b`, 'i'),
  theme,
}));

// The art for someone's profile cover: things they mention in their bio first, in the
// order they mention them, then their picked interests.
export function profileThemes(
  bio: string | null | undefined,
  interests: string[] | null | undefined,
  max = 5
): BioTheme[] {
  const found: { at: number; theme: BioTheme }[] = [];
  for (const { pattern, theme } of MATCHERS) {
    const match = bio ? pattern.exec(bio) : null;
    if (match) found.push({ at: match.index, theme });
  }
  const themes = found.sort((a, b) => a.at - b.at).map((f) => f.theme);

  for (const key of interests ?? []) {
    const category = Categories[key as Category];
    if (category) themes.push({ emoji: category.emoji, color: category.color });
  }

  // No repeats (e.g. "gym" in the bio and Gym as an interest).
  const seen = new Set<string>();
  return themes.filter((t) => !seen.has(t.emoji) && seen.add(t.emoji)).slice(0, max);
}
