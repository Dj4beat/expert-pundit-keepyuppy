import type {
  CharacterContent,
  Challenge,
  Objective,
  Power,
  ShopItem,
  VenueContent,
} from './types';
export const BALANCE = {
  hitXP: 6,
  perfectXP: 4,
  hitCoins: 2,
  firstCoins: 80,
  starCoins: 35,
  levelCoins: 70,
  masteryStep: 200,
  upgradeCap: 3,
  upgradePrices: [180, 380, 650],
  feverHits: 8,
  eventInterval: 12,
  trickStreak: 5,
  maxLevel: 30,
  maxRunHits: 10000,
};
export const DIFFICULTIES = {
  casual: {
    name: 'Casual',
    window: 0.22,
    perfect: 0.08,
    description: 'A little more room to find your flow.',
  },
  standard: {
    name: 'Standard',
    window: 0.155,
    perfect: 0.052,
    description: 'The original test of touch and timing.',
  },
  expert: {
    name: 'Expert',
    window: 0.105,
    perfect: 0.033,
    description: 'Small windows. Big bragging rights.',
  },
};
export const CHARACTERS: CharacterContent[] = [
  {
    id: 'ronaldinho',
    name: 'Ronaldinho',
    country: 'Brazil',
    number: 10,
    trick: 'Elastico',
    accent: '#f1c632',
    skin: '#b97543',
    unlock: 0,
    price: 0,
    description: 'A smile, a little samba, and a touch of magic.',
  },
  {
    id: 'okocha',
    name: 'Jay-Jay Okocha',
    country: 'Nigeria',
    number: 10,
    trick: 'Rainbow flick',
    accent: '#40a77b',
    skin: '#764b34',
    unlock: 1,
    price: 0,
    description: 'So good they named him twice.',
  },
  {
    id: 'baggio',
    name: 'Roberto Baggio',
    country: 'Italy',
    number: 10,
    trick: 'Divine flick',
    accent: '#4886d1',
    skin: '#d6a17d',
    unlock: 2,
    price: 0,
    description: 'Artistry at the end of a ponytail.',
  },
  {
    id: 'best',
    name: 'George Best',
    country: 'Northern Ireland',
    number: 7,
    trick: 'Belfast shuffle',
    accent: '#cb3943',
    skin: '#dda77d',
    unlock: 3,
    price: 0,
    description: 'A natural talent. An impossible touch.',
  },
  {
    id: 'cruyff',
    name: 'Johan Cruyff',
    country: 'Netherlands',
    number: 14,
    trick: 'Cruyff turn',
    accent: '#ed8131',
    skin: '#dda77d',
    unlock: 4,
    price: 0,
    description: 'Make the beautiful game look simple.',
  },
  {
    id: 'zidane',
    name: 'Zinedine Zidane',
    country: 'France',
    number: 10,
    trick: 'Roulette',
    accent: '#3656a4',
    skin: '#c59470',
    unlock: 5,
    price: 0,
    description: 'Every touch, a little more elegance.',
  },
  {
    id: 'pele',
    name: 'Pelé',
    country: 'Brazil',
    number: 10,
    trick: 'King’s crown',
    accent: '#f1c632',
    skin: '#995b36',
    unlock: 6,
    price: 0,
    description: 'The king of the beautiful game.',
  },
  {
    id: 'maradona',
    name: 'Diego Maradona',
    country: 'Argentina',
    number: 10,
    trick: 'Cosmic spin',
    accent: '#7ebbd7',
    skin: '#b9815b',
    unlock: 1,
    price: 650,
    description: 'A left foot that could write poetry.',
  },
  {
    id: 'henry',
    name: 'Thierry Henry',
    country: 'France',
    number: 14,
    trick: 'Highbury heel',
    accent: '#ce3740',
    skin: '#976141',
    unlock: 2,
    price: 800,
    description: 'Effortless style. Unmistakable class.',
  },
  {
    id: 'ronaldo',
    name: 'Ronaldo Nazário',
    country: 'Brazil',
    number: 9,
    trick: 'Phenomenon',
    accent: '#e4c131',
    skin: '#bc8459',
    unlock: 3,
    price: 1000,
    description: 'The original phenomenon, at your feet.',
  },
  {
    id: 'messi',
    name: 'Lionel Messi',
    country: 'Argentina',
    number: 10,
    trick: 'La Pulga lift',
    accent: '#77b8d3',
    skin: '#d2a17d',
    unlock: 4,
    price: 1250,
    description: 'Small touches. Extraordinary possibilities.',
  },
  {
    id: 'cristiano',
    name: 'Cristiano Ronaldo',
    country: 'Portugal',
    number: 7,
    trick: 'Siuu step-over',
    accent: '#ba3541',
    skin: '#c29169',
    unlock: 5,
    price: 1500,
    description: 'Reach higher. Then reach higher again.',
  },
];
export const VENUES: VenueContent[] = [
  {
    id: 'court',
    name: 'The Neighbourhood',
    location: 'WHERE IT ALL BEGINS',
    chapter: 'Street beginnings',
    color: '#cf9765',
  },
  {
    id: 'beach',
    name: 'Beach Promenade',
    location: 'SALT AIR. SILKY TOUCHES.',
    chapter: 'Coastal rhythm',
    color: '#67b8b7',
  },
  {
    id: 'rooftop',
    name: 'Rooftop Pitch',
    location: 'ABOVE THE EVERYDAY',
    chapter: 'Sky-high skills',
    color: '#a890c6',
  },
  {
    id: 'cage',
    name: 'The Urban Cage',
    location: 'UNDER THE LIGHTS',
    chapter: 'After-dark artists',
    color: '#648bae',
  },
  {
    id: 'training',
    name: 'Training Ground',
    location: 'GREATNESS TAKES PRACTICE',
    chapter: 'Fine margins',
    color: '#81aa67',
  },
  {
    id: 'stadium',
    name: 'The Grand Stadium',
    location: 'YOUR MOMENT IS HERE',
    chapter: 'Become a legend',
    color: '#dfbb70',
  },
];
const names = [
  [
    'First touch',
    'Find your feet',
    'Sweet spot',
    'Keep the rhythm',
    'A little magic',
    'Golden beginnings',
  ],
  [
    'Sea breeze',
    'High tide',
    'Perfect afternoon',
    'Coastal control',
    'Samba by the sea',
    'Promenade royalty',
  ],
  [
    'Rising talent',
    'Cloud nine',
    'Head in the clouds',
    'Skyline shuffle',
    'Double vision',
    'On top of the world',
  ],
  [
    'Lights on',
    'Concrete rhythm',
    'Cage control',
    'Midnight magic',
    'Two to tango',
    'Own the night',
  ],
  [
    'Back to basics',
    'Fine margins',
    'The perfect drill',
    'Trick school',
    'Double session',
    'First-team material',
  ],
  [
    'Tunnel vision',
    'Hear the crowd',
    'Centre stage',
    'Showtime',
    'Golden boots',
    'The beautiful game',
  ],
];
const objective = (metric: Objective['metric'], target: number, label: string): Objective => ({
  metric,
  target,
  label,
});
export const CHALLENGES: Challenge[] = names.flatMap((chapter, c) =>
  chapter.map((name, i) => {
    const hits = 6 + c * 6 + i * 3;
    const primary =
      i === 2
        ? objective('bestStreak', 3 + c, `Chain ${3 + c} perfect touches`)
        : i === 3
          ? objective('score', 500 + c * 400, `Score ${500 + c * 400} points`)
          : i === 4 && c < 2
            ? objective('tricks', 1 + c, `Complete ${1 + c} signature ${c ? 'moves' : 'move'}`)
            : i === 4
              ? objective('bonusHits', 2 + c, `Make ${2 + c} bonus-ball touches`)
              : objective('hits', hits, `Make ${hits} main-ball touches`);
    const secondary =
      primary.metric === 'bestStreak'
        ? objective('hits', hits, `Make ${hits} main-ball touches`)
        : objective('bestStreak', 4 + c, `Chain ${4 + c} perfect touches`);
    const tertiary = objective(
      'score',
      Math.max(900, (hits + 3) * 135),
      `Score ${Math.max(900, (hits + 3) * 135)} points`,
    );
    return {
      id: c * 6 + i + 1,
      chapter: c,
      name,
      description: [
        'Every legend starts with one touch.',
        'Read the drop. Trust your timing.',
        'Let the ball set the rhythm.',
        'A softer touch goes a long way.',
        'Time to add something special.',
        'Bring everything together.',
      ][i],
      objectives: [primary, secondary, tertiary],
      events: c >= 2 ? ['multiball', 'golden-score', 'golden-xp'] : i === 5 ? ['golden-score'] : [],
      maxHits: Math.max(hits + 12, 30 + c * 6),
    };
  }),
);
export const POWERS: Record<Power, { name: string; icon: string; description: string }> = {
  'second-wind': {
    name: 'Second Wind',
    icon: '↺',
    description:
      'Rescues a missed main-ball touch before it lands. 1 charge; upgrades add charges.',
  },
  focus: {
    name: 'Focus',
    icon: '◎',
    description: 'A late touch slows play for 3 seconds. 2 charges; upgrades add 1 second.',
  },
  'golden-touch': {
    name: 'Golden Touch',
    icon: '✦',
    description:
      '5 perfects widen contact windows for 4 seconds. 2 charges; upgrades add 1 second.',
  },
};
export const SHOP: ShopItem[] = [
  ...CHARACTERS.filter((c) => c.price).map((c) => ({
    id: c.id,
    name: c.name,
    type: 'legend' as const,
    price: c.price,
    chapter: c.unlock,
    description: c.trick,
  })),
  {
    id: 'ball-gold',
    name: 'Golden era',
    type: 'ball',
    price: 160,
    chapter: 0,
    description: 'A little gold at your feet.',
  },
  {
    id: 'ball-neon',
    name: 'After hours',
    type: 'ball',
    price: 220,
    chapter: 0,
    description: 'Electric cyan. Impossible to miss.',
  },
  {
    id: 'kit-midnight',
    name: 'Midnight kit',
    type: 'kit',
    price: 200,
    chapter: 0,
    description: 'Charcoal and gold accents.',
  },
  {
    id: 'kit-crimson',
    name: 'Pundit red',
    type: 'kit',
    price: 200,
    chapter: 0,
    description: 'Wear the Expert Pundit colours.',
  },
  {
    id: 'effect-confetti',
    name: 'Confetti shower',
    type: 'effect',
    price: 250,
    chapter: 0,
    description: 'Make the big moments colourful.',
  },
  ...Object.entries(POWERS).map(([id, p]) => ({
    id,
    name: p.name,
    type: 'upgrade' as const,
    price: BALANCE.upgradePrices[0],
    chapter: 0,
    description: p.description,
  })),
];
export const xpForLevel = (level: number) => Math.round(100 * (level - 1) + 35 * (level - 1) ** 2);
export const levelForXP = (xp: number) =>
  Array.from({ length: 30 }, (_, i) => i + 1)
    .filter((l) => xp >= xpForLevel(l))
    .at(-1) ?? 1;
export const character = (id: string) => CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
export const venue = (id: string) => VENUES.find((v) => v.id === id) ?? VENUES[0];
export const ACHIEVEMENTS = [
  { id: 'First ten', metric: 'totalHits', target: 10, coins: 50 },
  { id: 'Centurion', metric: 'totalHits', target: 100, coins: 100 },
  { id: 'Thousand club', metric: 'totalHits', target: 1000, coins: 300 },
  { id: 'Perfect ten', metric: 'bestStreak', target: 10, coins: 100 },
  { id: 'Trick artist', metric: 'tricks', target: 3, coins: 100 },
  { id: 'Double act', metric: 'bonusHits', target: 5, coins: 100 },
] as const;
export const TRICK_MOTION: Record<
  string,
  { turn: number; hop: number; sway: number; arms: number; heel: number }
> = {
  ronaldinho: { turn: 0, hop: 0, sway: 35, arms: 0.6, heel: 1 },
  okocha: { turn: 0, hop: 20, sway: 0, arms: 1, heel: 2 },
  baggio: { turn: 0, hop: 10, sway: 15, arms: 0.4, heel: 0.5 },
  best: { turn: 0, hop: 0, sway: 50, arms: 0.7, heel: 0.8 },
  cruyff: { turn: 1, hop: 0, sway: 10, arms: 0.5, heel: 1 },
  zidane: { turn: 2, hop: 0, sway: 0, arms: 1.1, heel: 0 },
  pele: { turn: 0, hop: 25, sway: 0, arms: 1.6, heel: 0 },
  maradona: { turn: 3, hop: 8, sway: 20, arms: 1, heel: 0.5 },
  henry: { turn: 1, hop: 0, sway: 0, arms: 0.3, heel: 1.8 },
  ronaldo: { turn: 0, hop: 6, sway: 35, arms: 0.6, heel: 1.5 },
  messi: { turn: 0, hop: 4, sway: 22, arms: 0.2, heel: 0.4 },
  cristiano: { turn: 1, hop: 38, sway: 0, arms: 1.4, heel: 1 },
};
