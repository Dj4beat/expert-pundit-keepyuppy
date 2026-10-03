export type Difficulty = 'casual' | 'standard' | 'expert';
export type Mode = 'career' | 'endless' | 'practice' | 'lesson';
export type Power = 'second-wind' | 'focus' | 'golden-touch';
export type Grade = 'perfect' | 'early' | 'late' | 'miss' | 'rescue';
export type Touch = 'foot' | 'knee' | 'head';
export type EventKind = 'golden-score' | 'golden-xp' | 'multiball';
export interface CharacterContent {
  id: string;
  name: string;
  country: string;
  number: number;
  trick: string;
  accent: string;
  skin: string;
  unlock: number;
  price: number;
  description: string;
}
export interface VenueContent {
  id: string;
  name: string;
  location: string;
  chapter: string;
  color: string;
}
export interface Objective {
  metric: 'hits' | 'bestStreak' | 'score' | 'tricks' | 'bonusHits';
  target: number;
  label: string;
}
export interface Challenge {
  id: number;
  chapter: number;
  name: string;
  description: string;
  objectives: [Objective, Objective, Objective];
  events: EventKind[];
  maxHits: number;
}
export interface RunSettings {
  mode: Mode;
  difficulty: Difficulty;
  character: string;
  venue: string;
  power: Power;
  powerLevel: number;
  pace: number;
  seed: number;
  challenge?: number;
  ball: string;
  kit: string;
  effect: string;
}
export interface InputAction {
  type: 'tap';
  at: number;
}
export interface RunResult {
  id: string;
  settings: RunSettings;
  hits: number;
  perfects: number;
  bestStreak: number;
  score: number;
  tricks: number;
  bonusHits: number;
  duration: number;
  xpBonus: number;
  rescued: boolean;
  reason: 'drop' | 'complete' | 'finish';
}
export interface Preferences {
  sound: boolean;
  music: boolean;
  reduced: boolean;
  contrast: boolean;
  vibration: boolean;
}
export interface PlayerSave {
  version: 2;
  coins: number;
  xp: number;
  owned: string[];
  stars: Record<string, number>;
  mastery: Record<string, number>;
  records: Record<Difficulty, number>;
  upgrades: Record<Power, number>;
  cosmetics: string[];
  selected: {
    character: string;
    venue: string;
    difficulty: Difficulty;
    power: Power;
    ball: string;
    kit: string;
    effect: string;
  };
  settings: Preferences;
  rewarded: string[];
  achievements: string[];
  totalHits: number;
  lessonDone: boolean;
}
export interface ShopItem {
  id: string;
  name: string;
  type: 'legend' | 'ball' | 'kit' | 'effect' | 'upgrade';
  price: number;
  chapter: number;
  description: string;
}
