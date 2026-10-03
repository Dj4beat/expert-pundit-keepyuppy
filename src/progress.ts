import { ACHIEVEMENTS, BALANCE, CHARACTERS, CHALLENGES, SHOP, VENUES, levelForXP } from './content';
import type { Difficulty, PlayerSave, Power, RunResult } from './types';
export const SAVE_KEY = 'expert-pundit-keepyuppy-v2';
export const BACKUP_KEY = SAVE_KEY + '-backup';
export const defaultSave = (): PlayerSave => ({
  version: 2,
  coins: 0,
  xp: 0,
  owned: ['ronaldinho'],
  stars: {},
  mastery: {},
  records: { casual: 0, standard: 0, expert: 0 },
  upgrades: { 'second-wind': 0, focus: 0, 'golden-touch': 0 },
  cosmetics: [],
  selected: {
    character: 'ronaldinho',
    venue: 'court',
    difficulty: 'standard',
    power: 'second-wind',
    ball: 'classic',
    kit: 'original',
    effect: 'spark',
  },
  settings: { sound: true, music: false, reduced: false, contrast: false, vibration: false },
  rewarded: [],
  achievements: [],
  totalHits: 0,
  lessonDone: false,
});
export const starCount = (mask: number) => [1, 2, 4].filter((b) => mask & b).length;
export const completedChapters = (s: PlayerSave) => {
  let n = 0;
  for (let c = 0; c < 6; c++) {
    if (CHALLENGES.filter((ch) => ch.chapter === c).every((ch) => (s.stars[ch.id] ?? 0) & 1)) n++;
    else break;
  }
  return n;
};
export const challengeUnlocked = (s: PlayerSave, id: number) =>
  id === 1 || !!((s.stars[id - 1] ?? 0) & 1);
export function reconcileUnlocks(s: PlayerSave) {
  const chapters = completedChapters(s);
  for (const c of CHARACTERS)
    if (c.price === 0 && c.unlock <= chapters && !s.owned.includes(c.id)) s.owned.push(c.id);
}
export function award(s: PlayerSave, r: RunResult) {
  if (s.rewarded.includes(r.id) || r.settings.mode === 'practice' || r.settings.mode === 'lesson')
    return { coins: 0, xp: 0, stars: 0, unlocked: [] as string[], duplicate: true };
  const before = [...s.owned];
  const oldLevel = levelForXP(s.xp);
  let coins = r.hits * BALANCE.hitCoins;
  let xp = r.hits * BALANCE.hitXP + r.perfects * BALANCE.perfectXP + r.xpBonus;
  let earned = 0;
  if (r.settings.mode === 'career') {
    const ch = CHALLENGES[(r.settings.challenge ?? 0) - 1];
    if (!ch || !challengeUnlocked(s, ch.id))
      return { coins: 0, xp: 0, stars: 0, unlocked: [], duplicate: true };
    const mask = ch.objectives.reduce(
      (mask, o, i) => mask | (r[o.metric] >= o.target ? 1 << i : 0),
      0,
    );
    const previous = s.stars[ch.id] ?? 0;
    if (mask & 1) {
      earned = starCount(mask & ~previous);
      coins += earned * BALANCE.starCoins;
      if (!(previous & 1)) {
        coins += BALANCE.firstCoins;
        xp += 100;
      }
      s.stars[ch.id] = previous | mask;
    }
  }
  s.xp += xp;
  s.totalHits += r.hits;
  s.mastery[r.settings.character] = (s.mastery[r.settings.character] ?? 0) + r.hits;
  s.records[r.settings.difficulty] = Math.max(s.records[r.settings.difficulty], r.score);
  coins += (levelForXP(s.xp) - oldLevel) * BALANCE.levelCoins;
  for (const a of ACHIEVEMENTS) {
    const reached = (a.metric === 'totalHits' ? s.totalHits : r[a.metric]) >= a.target;
    if (reached && !s.achievements.includes(a.id)) {
      s.achievements.push(a.id);
      coins += a.coins;
    }
  }
  s.coins += coins;
  s.rewarded.push(r.id);
  reconcileUnlocks(s);
  return {
    coins,
    xp,
    stars: earned,
    unlocked: s.owned.filter((id) => !before.includes(id)),
    duplicate: false,
  };
}
export function purchase(s: PlayerSave, id: string): string {
  const item = SHOP.find((i) => i.id === id);
  if (!item) return 'Unknown item.';
  if (completedChapters(s) < item.chapter) return `Complete chapter ${item.chapter} first.`;
  if (item.type === 'upgrade') {
    const power = id as Power;
    const level = s.upgrades[power];
    if (level >= BALANCE.upgradeCap) return 'Already fully upgraded.';
    const price = BALANCE.upgradePrices[level];
    if (s.coins < price) return 'Keep playing to earn more coins.';
    s.coins -= price;
    s.upgrades[power]++;
    return 'Upgrade unlocked.';
  }
  const list = item.type === 'legend' ? s.owned : s.cosmetics;
  if (list.includes(id)) return 'Already in your collection.';
  if (s.coins < item.price) return 'Keep playing to earn more coins.';
  s.coins -= item.price;
  list.push(id);
  return 'Added to your collection.';
}
const obj = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('Invalid save object.');
  return v as Record<string, unknown>;
};
const num = (v: unknown, max = 1e9) => {
  if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < 0 || v > max)
    throw new Error('Invalid save number.');
  return v;
};
const strings = (v: unknown, allowed?: string[]) => {
  if (
    !Array.isArray(v) ||
    v.length > 100000 ||
    v.some((x) => typeof x !== 'string' || x.length > 150 || (allowed && !allowed.includes(x)))
  )
    throw new Error('Invalid save list.');
  return [...new Set(v)] as string[];
};
export function validateSave(raw: unknown): PlayerSave {
  const data = obj(raw);
  if (data.version !== 1 && data.version !== 2)
    throw new Error('This backup uses an unsupported save version.');
  // v1 was the documented minimal prototype: currencies, owned legends and stars.
  const s = defaultSave();
  s.coins = num(data.coins);
  s.xp = num(data.xp);
  s.owned = strings(
    data.owned,
    CHARACTERS.map((c) => c.id),
  );
  if (!s.owned.includes('ronaldinho')) throw new Error('Starter legend is missing.');
  const stars = obj(data.stars);
  for (const [id, mask] of Object.entries(stars)) {
    if (!CHALLENGES.some((c) => String(c.id) === id)) throw new Error('Unknown challenge.');
    s.stars[id] = num(mask, 7);
  }
  for (let i = 2; i <= 36; i++)
    if (s.stars[i] && !((s.stars[i - 1] ?? 0) & 1)) throw new Error('Career order is invalid.');
  if (data.version === 1) {
    reconcileUnlocks(s);
    return s;
  }
  for (const [id, n] of Object.entries(obj(data.mastery))) {
    if (!CHARACTERS.some((c) => c.id === id)) throw new Error('Unknown mastery.');
    s.mastery[id] = num(n);
  }
  const rec = obj(data.records);
  for (const d of ['casual', 'standard', 'expert'] as Difficulty[]) s.records[d] = num(rec[d]);
  const upgrades = obj(data.upgrades);
  for (const p of ['second-wind', 'focus', 'golden-touch'] as Power[])
    s.upgrades[p] = num(upgrades[p], 3);
  s.cosmetics = strings(
    data.cosmetics,
    SHOP.filter((i) => ['ball', 'kit', 'effect'].includes(i.type)).map((i) => i.id),
  );
  s.rewarded = strings(data.rewarded);
  s.achievements = strings(
    data.achievements,
    ACHIEVEMENTS.map((a) => a.id),
  );
  s.totalHits = num(data.totalHits);
  const settings = obj(data.settings);
  for (const key of Object.keys(s.settings) as (keyof PlayerSave['settings'])[]) {
    if (typeof settings[key] !== 'boolean') throw new Error('Invalid setting.');
    s.settings[key] = settings[key];
  }
  if (typeof data.lessonDone !== 'boolean') throw new Error('Invalid lesson state.');
  s.lessonDone = data.lessonDone;
  const selected = obj(data.selected);
  const pick = (key: string, allowed: string[]) => {
    if (typeof selected[key] !== 'string' || !allowed.includes(selected[key] as string))
      throw new Error('Invalid selection.');
    return selected[key] as string;
  };
  s.selected.character = pick('character', s.owned);
  s.selected.venue = pick(
    'venue',
    VENUES.slice(0, Math.min(6, completedChapters(s) + 1)).map((v) => v.id),
  );
  s.selected.difficulty = pick('difficulty', ['casual', 'standard', 'expert']) as Difficulty;
  s.selected.power = pick('power', Object.keys(s.upgrades)) as Power;
  for (const key of ['ball', 'kit', 'effect'] as const)
    s.selected[key] = pick(key, [
      defaultSave().selected[key],
      ...s.cosmetics.filter((id) => SHOP.find((i) => i.id === id)?.type === key),
      ...(key === 'kit' && (s.mastery[s.selected.character] ?? 0) >= 1000 ? ['mastery'] : []),
    ]);
  reconcileUnlocks(s);
  return s;
}
export class SaveStore {
  save = defaultSave();
  persistent = true;
  notice = '';
  constructor(private storage: Pick<Storage, 'getItem' | 'setItem'> | null) {
    this.load();
  }
  load() {
    if (!this.storage) {
      this.persistent = false;
      this.notice = 'Session only: storage is unavailable. Export a backup before leaving.';
      return;
    }
    try {
      const raw = this.storage.getItem(SAVE_KEY);
      if (raw) {
        try {
          this.save = validateSave(JSON.parse(raw));
        } catch {
          const backup = this.storage.getItem(BACKUP_KEY);
          if (backup) {
            this.save = validateSave(JSON.parse(backup));
            this.notice = 'Recovered your previous valid backup.';
          } else {
            this.notice =
              'The save could not be read. A fresh session is ready; import a backup to recover.';
          }
        }
      }
      this.storage.setItem(SAVE_KEY, JSON.stringify(this.save));
    } catch {
      this.persistent = false;
      this.notice =
        'Session only: storage is unavailable or damaged. Export a backup before leaving.';
    }
  }
  persist() {
    if (!this.storage || !this.persistent) return;
    try {
      const previous = this.storage.getItem(SAVE_KEY);
      const next = JSON.stringify(this.save);
      // Menu rendering and duplicate rewards must not rotate away recovery history.
      if (previous === next) return;
      if (previous) {
        try {
          validateSave(JSON.parse(previous));
          this.storage.setItem(BACKUP_KEY, previous);
        } catch {
          /* Preserve the last valid backup. */
        }
      }
      this.storage.setItem(SAVE_KEY, next);
    } catch {
      this.persistent = false;
      this.notice = 'Session only: storage is full or unavailable. Export your progress.';
    }
  }
  async transaction<T>(fn: (save: PlayerSave) => T): Promise<T> {
    const run = () => {
      if (this.persistent) this.load();
      const result = fn(this.save);
      this.persist();
      return result;
    };
    return typeof navigator !== 'undefined' && navigator.locks
      ? navigator.locks.request(SAVE_KEY, run)
      : run();
  }
  export() {
    return JSON.stringify(this.save, null, 2);
  }
  import(raw: string) {
    if (raw.length > 8e6) throw new Error('Backup is too large.');
    const imported = validateSave(JSON.parse(raw));
    this.save = imported;
    this.persist();
  }
  recover() {
    if (!this.storage) throw new Error('No stored backup.');
    const raw = this.storage.getItem(BACKUP_KEY);
    if (!raw) throw new Error('No stored backup yet.');
    this.import(raw);
  }
}
