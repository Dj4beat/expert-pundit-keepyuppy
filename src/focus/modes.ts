export type FocusMode = 'levels' | 'endless' | 'practice';
export type ChallengeDuration = '2-minutes' | '5-minutes' | 'unlimited';
export const DURATION_NAMES: Record<ChallengeDuration, string> = {
  '2-minutes': '2 Minutes',
  '5-minutes': '5 Minutes',
  unlimited: 'Unlimited',
};
export const DURATION_SECONDS: Record<ChallengeDuration, number> = {
  '2-minutes': 120,
  '5-minutes': 300,
  unlimited: Infinity,
};
export function cleanPlayerName(value: string) {
  const cleaned = Array.from(
    value
      .replace(/[^\p{L}\p{N} _.'-]/gu, '')
      .replace(/\s+/g, ' ')
      .trim(),
  )
    .slice(0, 12)
    .join('');
  return /[\p{L}\p{N}]/u.test(cleaned) ? cleaned : '';
}
// Historical records and scripted demos retain a readable fallback.
export function playerName(value: string) {
  return cleanPlayerName(value) || 'PLAYER';
}
// Every ball resolves before a tour round ends; drops consume one attempt.
export const LEVELS = [
  { name: 'Find your rhythm', attempts: 12, touches: 6 },
  { name: 'Keep it flowing', attempts: 14, touches: 7 },
  { name: 'Both feet', attempts: 16, touches: 8 },
  { name: 'Head in the game', attempts: 18, touches: 9 },
  { name: 'Under control', attempts: 20, touches: 10 },
  { name: 'Street style', attempts: 22, touches: 11 },
  { name: 'Raise the tempo', attempts: 24, touches: 12 },
  { name: 'No hesitation', attempts: 26, touches: 13 },
  { name: 'In the zone', attempts: 28, touches: 14 },
  { name: 'Showtime', attempts: 30, touches: 15 },
  { name: 'Legend territory', attempts: 32, touches: 16 },
  { name: 'The perfect run', attempts: 34, touches: 17 },
] as const;
export const MODE_NAMES: Record<FocusMode, string> = {
  levels: 'Character tour',
  endless: 'Score challenge',
  practice: 'Practice',
};
