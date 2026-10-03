import { expect, it } from 'vitest';
import { gameEntry } from '../src/entry';

it('opens the current game at the hosted homepage and retains the explicit original link', () => {
  expect(gameEntry('')).toBe('focus');
  expect(gameEntry('?focus')).toBe('focus');
  expect(gameEntry('?classic')).toBe('classic');
  expect(gameEntry('?benchmark')).toBe('benchmark');
});
it('keeps portable editions opening their own game', () => {
  expect(gameEntry('', true)).toBe('classic');
  expect(gameEntry('', true, true)).toBe('focus');
  expect(gameEntry('?focus', true)).toBe('focus');
});
