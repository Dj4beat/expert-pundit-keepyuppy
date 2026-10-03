import { FOCUS_CHARACTERS, characterForLevel } from './characters';
import type { Difficulty } from '../types';
import {
  LEVELS,
  cleanPlayerName,
  playerName,
  type ChallengeDuration,
  type FocusMode,
} from './modes';
import type { FocusRound } from './simulation';

export const LEGACY_FOCUS_SAVE_KEY = 'expert-pundit-keepyuppy-focus-v1';
export const FOCUS_SAVE_KEY = 'expert-pundit-keepyuppy-focus-v2';
export interface FocusRecord {
  character: string;
  score: number;
  hits: number;
  perfects: number;
  best: number;
  stars: number;
  playerName: string;
  duration: ChallengeDuration;
  elapsed: number;
  completed: boolean;
}
export interface RecordResult {
  qualified: boolean;
  personalBest: boolean;
  boardLeader: boolean;
}
interface Save {
  version: 2;
  boards: Record<string, FocusRecord[]>;
  stars: Record<string, number>;
  personalBests: Record<string, Record<string, FocusRecord>>;
  playerName: string;
  nameConfirmed: boolean;
  attractEnabled: boolean;
}
const empty = (): Save => ({
  version: 2,
  boards: {},
  stars: {},
  personalBests: {},
  playerName: '',
  nameConfirmed: false,
  attractEnabled: true,
});
const integer = (n: unknown, max = 1e9): n is number =>
  typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= max;
const validKey = (key: string) =>
  /^(casual|standard|expert):(endless:(2-minutes|5-minutes|unlimited)|(levels|rounds|attempts):([1-9]|1[0-2]))$/.test(
    key,
  ) ||
  FOCUS_CHARACTERS.some((c) =>
    new RegExp(`^(casual|standard|expert):skills:${c.id}:(2-minutes|5-minutes|unlimited)$`).test(
      key,
    ),
  );
const keyFor = (
  difficulty: Difficulty,
  mode: FocusMode,
  level: number,
  duration: ChallengeDuration,
  character = 'ronaldinho',
) =>
  mode === 'levels'
    ? `${difficulty}:attempts:${level}`
    : `${difficulty}:skills:${character}:${duration}`;
const starKey = (difficulty: Difficulty, level: number) => `${difficulty}:levels:${level}`;
const compare = (a: FocusRecord, b: FocusRecord) =>
  b.score - a.score || b.perfects - a.perfects || b.best - a.best;
const identity = (name: string) => name.toLocaleLowerCase('en');
const blankResult = (): RecordResult => ({
  qualified: false,
  personalBest: false,
  boardLeader: false,
});

function parseRecord(value: unknown, key: string, legacy: boolean): FocusRecord | null {
  if (!value || typeof value !== 'object') return null;
  const r = value as Record<string, unknown>;
  if (
    !integer(r.score) ||
    !integer(r.hits) ||
    !integer(r.perfects) ||
    r.perfects > r.hits ||
    !integer(r.best) ||
    r.best > r.perfects ||
    !integer(r.stars, 5)
  )
    return null;
  const levelRecord =
    key.includes(':levels:') || key.includes(':rounds:') || key.includes(':attempts:');
  const duration = levelRecord ? 'unlimited' : (key.split(':').at(-1) as ChallengeDuration);
  if (
    !legacy &&
    (typeof r.playerName !== 'string' ||
      r.duration !== duration ||
      typeof r.elapsed !== 'number' ||
      !Number.isFinite(r.elapsed) ||
      r.elapsed < 0 ||
      typeof r.completed !== 'boolean')
  )
    return null;
  if (
    !legacy &&
    !levelRecord &&
    duration !== 'unlimited' &&
    (!r.completed || r.elapsed !== (duration === '2-minutes' ? 120 : 300))
  )
    return null;
  return {
    character:
      key.includes(':rounds:') || key.includes(':attempts:')
        ? characterForLevel(Number(key.split(':').at(-1))).id
        : key.includes(':skills:')
          ? key.split(':')[2]
          : 'ronaldinho',
    score: r.score,
    hits: r.hits,
    perfects: r.perfects,
    best: r.best,
    stars: r.stars,
    playerName: legacy ? 'Earlier run' : playerName(r.playerName as string),
    duration,
    elapsed: legacy ? 0 : (r.elapsed as number),
    completed: legacy ? key.includes(':levels:') : (r.completed as boolean),
  };
}

/** Camera records are isolated from the original game's saves and economy. */
export class FocusProgress {
  private data = empty();
  private recorded = new WeakSet<FocusRound>();
  lastResult = blankResult();
  lastRank: number | null = null;
  warning = '';
  constructor(private storage: Pick<Storage, 'getItem' | 'setItem'> | null) {
    try {
      if (!storage) throw new Error('Storage unavailable');
      const raw = storage.getItem(FOCUS_SAVE_KEY) ?? storage.getItem(LEGACY_FOCUS_SAVE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (![1, 2].includes(saved.version) || !saved.boards || !saved.stars)
        throw new Error('Invalid save');
      const legacy = saved.version === 1;
      for (const [oldKey, values] of Object.entries(saved.boards)) {
        const key = legacy ? oldKey.replace(':endless:0', ':endless:unlimited') : oldKey;
        if (!validKey(key) || !Array.isArray(values)) continue;
        this.data.boards[key] = values
          .map((r) => parseRecord(r, key, legacy))
          .filter((r): r is FocusRecord => r !== null)
          .sort(compare)
          .slice(0, 5);
      }
      for (const [key, stars] of Object.entries(saved.stars)) {
        if (validKey(key) && key.includes(':levels:') && integer(stars, 5) && stars > 0)
          this.data.stars[key] = stars;
      }
      if (!legacy) {
        if (typeof saved.playerName === 'string') {
          const name = cleanPlayerName(saved.playerName);
          this.data.nameConfirmed =
            !!name && (name.toUpperCase() !== 'PLAYER' || saved.nameConfirmed === true);
          this.data.playerName = this.data.nameConfirmed ? name : '';
        }
        if (typeof saved.attractEnabled === 'boolean')
          this.data.attractEnabled = saved.attractEnabled;
        if (saved.personalBests && typeof saved.personalBests === 'object') {
          for (const [key, values] of Object.entries(saved.personalBests)) {
            if (!validKey(key) || !values || typeof values !== 'object') continue;
            for (const value of Object.values(values)) {
              const entry = parseRecord(value, key, false);
              if (entry) this.rememberBest(key, entry);
            }
          }
        }
      }
      for (const [key, entries] of Object.entries(this.data.boards))
        for (const entry of entries) this.rememberBest(key, entry);
      if (legacy) this.persist();
    } catch {
      this.warning =
        'Saved records could not be loaded. Records are available for this session only.';
      this.storage = null;
    }
  }
  get playerName() {
    return this.data.playerName;
  }
  setPlayerName(value: string) {
    this.data.playerName = cleanPlayerName(value);
    this.data.nameConfirmed = !!this.data.playerName;
    this.persist();
    return this.data.playerName;
  }
  get attractEnabled() {
    return this.data.attractEnabled;
  }
  setAttractEnabled(value: boolean) {
    this.data.attractEnabled = value;
    this.persist();
  }
  stars(difficulty: Difficulty, level: number) {
    return this.data.stars[starKey(difficulty, level)] ?? 0;
  }
  unlocked(difficulty: Difficulty) {
    let level = 1;
    while (level < LEVELS.length && this.stars(difficulty, level) > 0) level++;
    return level;
  }
  board(
    difficulty: Difficulty,
    mode: FocusMode,
    level: number,
    duration: ChallengeDuration = '2-minutes',
    character = 'ronaldinho',
  ) {
    if (mode === 'practice') return [];
    return (this.data.boards[keyFor(difficulty, mode, level, duration, character)] ?? []).map(
      (r) => ({
        ...r,
      }),
    );
  }
  personalBest(
    difficulty: Difficulty,
    mode: FocusMode,
    level: number,
    duration: ChallengeDuration = '2-minutes',
    character = 'ronaldinho',
    name = this.playerName,
  ) {
    if (mode === 'practice' || !name) return null;
    const record =
      this.data.personalBests[keyFor(difficulty, mode, level, duration, character)]?.[
        identity(name)
      ];
    return record ? { ...record } : null;
  }
  characterUnlocked(id: string) {
    const index = FOCUS_CHARACTERS.findIndex((c) => c.id === id);
    return (
      index >= 0 &&
      index < Math.max(...(['casual', 'standard', 'expert'] as const).map((d) => this.unlocked(d)))
    );
  }
  earlierBoards() {
    return this.populatedBoards().filter(
      ({ key }) =>
        key.includes(':levels:') || key.includes(':rounds:') || key.includes(':endless:'),
    );
  }
  /** Snapshot for attract mode; reading it cannot change progress. */
  populatedBoards() {
    return Object.entries(this.data.boards)
      .filter(([, records]) => records.length)
      .map(([key, records]) => ({ key, records: records.map((r) => ({ ...r })) }));
  }
  record(round: FocusRound) {
    this.lastResult = blankResult();
    this.lastRank = null;
    if (!round.ended || this.recorded.has(round)) return false;
    this.recorded.add(round);
    if (
      round.mode === 'practice' ||
      !round.hits ||
      (round.mode === 'levels' && round.reason !== 'complete') ||
      (round.mode === 'endless' && round.timed && round.reason !== 'timed-complete')
    )
      return false;
    const key = keyFor(round.difficulty, round.mode, round.stage, round.duration, round.character);
    const entry: FocusRecord = {
      character: round.character,
      score: round.score,
      hits: round.hits,
      perfects: round.perfects,
      best: round.best,
      stars: round.stars,
      playerName: round.playerName,
      duration: round.mode === 'levels' ? 'unlimited' : round.duration,
      elapsed: round.elapsed,
      completed: round.reason === 'complete' || round.reason === 'timed-complete',
    };
    const board = this.data.boards[key] ?? [];
    const previous = this.data.personalBests[key]?.[identity(entry.playerName)];
    this.lastResult = {
      qualified: true,
      personalBest: !previous || compare(entry, previous) < 0,
      boardLeader: !board.length || compare(entry, board[0]) < 0,
    };
    this.data.boards[key] = [...board, entry].sort(compare).slice(0, 5);
    const index = this.data.boards[key].indexOf(entry);
    this.lastRank = index < 0 ? null : index + 1;
    this.rememberBest(key, entry);
    if (round.mode === 'levels')
      this.data.stars[starKey(round.difficulty, round.stage)] = Math.max(
        this.stars(round.difficulty, round.stage),
        round.stars,
      );
    this.persist();
    return true;
  }
  private rememberBest(key: string, entry: FocusRecord) {
    const values =
      this.data.personalBests[key] ?? (this.data.personalBests[key] = Object.create(null));
    const name = identity(entry.playerName);
    if (!values[name] || compare(entry, values[name]) < 0) values[name] = { ...entry };
  }
  private persist() {
    try {
      if (!this.storage) throw new Error('Storage unavailable');
      this.storage.setItem(FOCUS_SAVE_KEY, JSON.stringify(this.data));
    } catch {
      this.warning = 'Storage unavailable. These results are saved for this session only.';
    }
  }
}
