export const BADGE_EMOJIS = ['😀', '😎', '🤤', '🦊', '🐼', '🐸', '🦄', '🍕', '🌮', '🍣', '🔥', '🌈'];
export const BADGE_COLORS = ['#ff9f43', '#ff6b6b', '#2ecc71', '#54a0ff', '#a29bfe', '#feca57', '#1dd1a1', '#ff9ff3'];

export interface Badge {
  emoji: string;
  color: string;
}

export function randomBadge(rng: () => number = Math.random): Badge {
  return {
    emoji: BADGE_EMOJIS[Math.floor(rng() * BADGE_EMOJIS.length)],
    color: BADGE_COLORS[Math.floor(rng() * BADGE_COLORS.length)],
  };
}
