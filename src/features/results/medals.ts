/** Podium / ranking medal tones. Warm gold leads (ties into the app's amber accent),
 * cool silver and warm bronze follow. Index 0 = 1st place. */
export const MEDALS = ['#ffd166', '#cbd3df', '#d98f5a'] as const;

/** Tone for a 0-based rank: medal for the top 3, a neutral dim for the rest. */
export function rankTone(rank: number, dim: string): string {
  return rank < MEDALS.length ? MEDALS[rank] : dim;
}
