import { CHARACTERS, VENUES } from '../content';
import type { FocusLimb } from './simulation';

/** Arcade perks are game balancing choices, not ratings of the real players. */
const SKILLS = [
  {
    name: 'Samba touch',
    description: '25% wider perfect window on both feet.',
    limbs: ['right-foot', 'left-foot'],
    perfect: 1.25,
  },
  {
    name: 'Rainbow control',
    description: '40% wider perfect window on knee touches.',
    limbs: ['knee'],
    perfect: 1.4,
  },
  { name: 'Divine touch', description: '15% wider perfect window on every touch.', perfect: 1.15 },
  {
    name: 'Quick feet',
    description: 'Perfect foot touches score 20% more.',
    limbs: ['right-foot', 'left-foot'],
    points: 1.2,
  },
  {
    name: 'Total control',
    description: '25% wider early/late save window on every touch.',
    save: 1.25,
  },
  {
    name: 'Silky control',
    description: 'Early and late saves earn 100 points instead of 40.',
    recovery: 100,
  },
  {
    name: 'King of the air',
    description: 'Perfect headers score 50% more.',
    limbs: ['head'],
    points: 1.5,
  },
  {
    name: 'Left-foot magic',
    description: '50% wider perfect window on the left foot.',
    limbs: ['left-foot'],
    perfect: 1.5,
  },
  {
    name: 'Elegant finish',
    description: 'Perfect right-foot touches score 35% more.',
    limbs: ['right-foot'],
    points: 1.35,
  },
  {
    name: 'Phenomenon',
    description: 'Perfect knee touches score 50% more.',
    limbs: ['knee'],
    points: 1.5,
  },
  {
    name: 'Close control',
    description: '40% wider early/late save window on both feet.',
    limbs: ['right-foot', 'left-foot'],
    save: 1.4,
  },
  {
    name: 'Aerial precision',
    description: '50% wider perfect window on headers.',
    limbs: ['head'],
    perfect: 1.5,
  },
] satisfies Skill[];
interface Skill {
  name: string;
  description: string;
  limbs?: FocusLimb[];
  perfect?: number;
  save?: number;
  points?: number;
  recovery?: number;
}
// Reuse the illustrated venues; consecutive tour characters change scenery.
const CHARACTER_VENUES = [
  'court',
  'beach',
  'rooftop',
  'cage',
  'training',
  'stadium',
  'beach',
  'court',
  'training',
  'cage',
  'rooftop',
  'stadium',
];
export const FOCUS_CHARACTERS = CHARACTERS.map((character, i) => ({
  ...character,
  skill: SKILLS[i] as Skill,
  venue: VENUES.find((venue) => venue.id === CHARACTER_VENUES[i])!,
}));
export function focusCharacter(id: string) {
  return FOCUS_CHARACTERS.find((character) => character.id === id) ?? FOCUS_CHARACTERS[0];
}
export function characterForLevel(level: number) {
  return FOCUS_CHARACTERS[level - 1] ?? FOCUS_CHARACTERS[0];
}
export function skillFor(id: string, limb: FocusLimb): Skill {
  const skill = focusCharacter(id).skill;
  return !skill.limbs || skill.limbs.includes(limb)
    ? skill
    : { name: skill.name, description: skill.description };
}
