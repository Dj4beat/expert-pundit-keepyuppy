import { describe, it, expect } from 'vitest';
import { BALANCE, CHARACTERS, CHALLENGES, SHOP, levelForXP, xpForLevel } from '../src/content';
import {
  award,
  challengeUnlocked,
  completedChapters,
  defaultSave,
  purchase,
  SaveStore,
  SAVE_KEY,
  BACKUP_KEY,
  validateSave,
} from '../src/progress';
import type { RunResult, RunSettings } from '../src/types';
const settings: RunSettings = {
  mode: 'career',
  difficulty: 'standard',
  character: 'ronaldinho',
  venue: 'court',
  power: 'second-wind',
  powerLevel: 0,
  pace: 1,
  seed: 2,
  ball: 'classic',
  kit: 'original',
  effect: 'spark',
  challenge: 1,
};
const result = (id: string, challenge = 1): RunResult => ({
  id,
  settings: { ...settings, challenge },
  hits: 100,
  perfects: 100,
  bestStreak: 100,
  score: 99999,
  tricks: 20,
  bonusHits: 20,
  duration: 150,
  xpBonus: 100,
  rescued: false,
  reason: 'complete',
});
function memory() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    data,
  };
}
describe('career and collection', () => {
  it('publishes 36 challenges with three achievable targets, six per chapter', () => {
    expect(CHALLENGES).toHaveLength(36);
    for (let chapter = 0; chapter < 6; chapter++)
      expect(CHALLENGES.filter((c) => c.chapter === chapter)).toHaveLength(6);
    for (const c of CHALLENGES) {
      expect(c.objectives).toHaveLength(3);
      expect(c.objectives[0].target).toBeGreaterThan(0);
      if (c.objectives[0].metric === 'hits') expect(c.objectives[0].target).toBeLessThan(c.maxHits);
    }
  });
  it('unlocks every chapter reward and all five coin legends', () => {
    const s = defaultSave();
    for (const ch of CHALLENGES) {
      expect(challengeUnlocked(s, ch.id)).toBe(true);
      award(s, result('career-' + ch.id, ch.id));
      expect(s.stars[ch.id]).toBe(7);
    }
    expect(completedChapters(s)).toBe(6);
    expect(s.owned).toHaveLength(7);
    s.coins = 20000;
    for (const c of CHARACTERS.filter((c) => c.price)) purchase(s, c.id);
    expect(s.owned).toHaveLength(12);
    expect(validateSave(s).owned).toHaveLength(12);
  });
  it('does not unlock a challenge when only secondary objectives pass', () => {
    const s = defaultSave();
    const r = result('fail');
    r.hits = 0;
    award(s, r);
    expect(challengeUnlocked(s, 2)).toBe(false);
    expect(s.stars[1]).toBeUndefined();
  });
  it('awards new stars only once and rewards a replay without repeating first-clear bonuses', () => {
    const s = defaultSave();
    const a = award(s, result('first'));
    const before = JSON.stringify(s);
    expect(award(s, result('first')).duplicate).toBe(true);
    expect(JSON.stringify(s)).toBe(before);
    const b = award(s, result('again'));
    expect(a.stars).toBe(3);
    expect(b.stars).toBe(0);
    expect(a.coins).toBeGreaterThan(b.coins);
  });
  it('separates records by difficulty and gives practice no progression', () => {
    const s = defaultSave();
    const r = result('practice');
    r.settings.mode = 'practice';
    award(s, r);
    expect(s.xp).toBe(0);
    r.settings.mode = 'endless';
    r.settings.difficulty = 'expert';
    award(s, r);
    expect(s.records.standard).toBe(0);
    expect(s.records.expert).toBe(r.score);
  });
  it('publishes thirty levels and caps level calculation', () => {
    expect(levelForXP(0)).toBe(1);
    for (let i = 1; i <= 30; i++) expect(levelForXP(xpForLevel(i))).toBe(i);
    expect(levelForXP(1e9)).toBe(30);
  });
  it('deducts prices exactly once and respects chapter gates and upgrade caps', () => {
    const s = defaultSave();
    s.coins = 10000;
    expect(purchase(s, 'messi')).toMatch(/chapter/);
    const item = SHOP.find((i) => i.id === 'ball-gold')!;
    purchase(s, item.id);
    expect(s.coins).toBe(10000 - item.price);
    purchase(s, item.id);
    expect(s.coins).toBe(10000 - item.price);
    const old = s.coins;
    for (let i = 0; i < 4; i++) purchase(s, 'focus');
    expect(s.upgrades.focus).toBe(3);
    expect(s.coins).toBe(old - BALANCE.upgradePrices.reduce((a, b) => a + b, 0));
  });
});
describe('local saves and backups', () => {
  it('round-trips export/import, reloads, and restores the previous valid backup', () => {
    const mem = memory();
    const store = new SaveStore(mem);
    store.save.coins = 100;
    store.persist();
    store.save.coins = 150;
    store.persist();
    const reload = new SaveStore(mem);
    expect(reload.save.coins).toBe(150);
    reload.recover();
    expect(reload.save.coins).toBe(100);
    const copy = new SaveStore(memory());
    copy.import(reload.export());
    expect(copy.save).toEqual(reload.save);
  });
  it('recovers a corrupt main save from a valid backup', () => {
    const mem = memory();
    const s = defaultSave();
    s.coins = 55;
    mem.setItem(BACKUP_KEY, JSON.stringify(s));
    mem.setItem(SAVE_KEY, '{broken');
    const store = new SaveStore(mem);
    expect(store.save.coins).toBe(55);
    expect(store.notice).toMatch(/Recovered/);
  });
  it('rejects malformed imports without overwriting progress', () => {
    const store = new SaveStore(memory());
    store.save.coins = 90;
    for (const raw of [
      '{}',
      'null',
      '[]',
      '{',
      '{"version":999}',
      JSON.stringify({ ...defaultSave(), coins: -10 }),
      JSON.stringify({
        ...defaultSave(),
        selected: { ...defaultSave().selected, character: 'pele' },
      }),
    ])
      expect(() => store.import(raw)).toThrow();
    expect(store.save.coins).toBe(90);
  });
  it('rejects out-of-range upgrade levels, skipped career order and unknown fields in records', () => {
    expect(() => validateSave({ ...defaultSave(), upgrades: { focus: 99 } })).toThrow();
    expect(() => validateSave({ ...defaultSave(), stars: { '20': 7 } })).toThrow();
    expect(() => validateSave({ ...defaultSave(), mastery: { unknown: 999 } })).toThrow();
  });
  it('migrates documented v1 saves', () => {
    expect(
      validateSave({ version: 1, coins: 40, xp: 0, owned: ['ronaldinho'], stars: {} }),
    ).toEqual({ ...defaultSave(), coins: 40 });
  });
  it('preserves session progress when persistent storage is unavailable', () => {
    const store = new SaveStore({
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
    });
    expect(store.persistent).toBe(false);
    store.save.coins = 20;
    store.persist();
    expect(JSON.parse(store.export()).coins).toBe(20);
  });
  it('serializes rewards into persistent storage and prevents duplicate awards after reload', async () => {
    const mem = memory();
    const s = new SaveStore(mem);
    await s.transaction((save) => award(save, result('unique')));
    const reloaded = new SaveStore(mem);
    const before = reloaded.export();
    await reloaded.transaction((save) => award(save, result('unique')));
    expect(reloaded.export()).toBe(before);
  });
});

it('does not replace recovery history when an unchanged menu save is persisted', () => {
  const mem = memory();
  const store = new SaveStore(mem);
  store.save.coins = 100;
  store.persist();
  store.save.coins = 150;
  store.persist();
  store.persist();
  store.persist();
  store.recover();
  expect(store.save.coins).toBe(100);
});
