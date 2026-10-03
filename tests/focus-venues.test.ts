import { afterEach, describe, expect, it, vi } from 'vitest';
import { existsSync } from 'node:fs';
import { FOCUS_CHARACTERS } from '../src/focus/characters';
import { FocusScene } from '../src/focus/scene';
import { FocusRound } from '../src/focus/simulation';

afterEach(() => vi.unstubAllGlobals());

describe('Character venues', () => {
  it('provides bundled venue artwork for every character and changes scenery at each tour step', () => {
    const venues = FOCUS_CHARACTERS.map((c) => c.venue.id);
    expect(new Set(venues).size).toBe(6);
    for (let i = 0; i < venues.length; i++) {
      expect(existsSync(`public/art/${venues[i]}.webp`)).toBe(true);
      if (i) expect(venues[i]).not.toBe(venues[i - 1]);
    }
  });
  it('renders the selected background image and venue name after switching characters', () => {
    const drawImage = vi.fn();
    const fillText = vi.fn();
    const ctx = new Proxy({ drawImage, fillText } as Record<string, unknown>, {
      get: (target, key) => target[String(key)] ?? (() => ({ addColorStop: () => {} })),
    });
    const canvas = { width: 800, height: 1360, setAttribute: vi.fn(), getContext: () => ctx };
    vi.stubGlobal('document', { createElement: () => canvas });
    const parent = { append: vi.fn() } as unknown as HTMLElement;
    const portrait = { naturalWidth: 1024, naturalHeight: 1536 } as HTMLImageElement;
    const court = { naturalWidth: 800, naturalHeight: 1360 } as HTMLImageElement;
    const scene = new FocusScene(parent, court, portrait);
    for (const character of FOCUS_CHARACTERS) {
      const venueImage = {
        naturalWidth: 800,
        naturalHeight: 1360,
        src: character.venue.id,
      } as HTMLImageElement;
      scene.setVenue(venueImage, character.venue.name);
      scene.setCharacter(portrait);
      drawImage.mockClear();
      fillText.mockClear();
      scene.draw(
        new FocusRound('standard', { mode: 'practice', character: character.id }),
        '',
        false,
      );
      expect(drawImage.mock.calls[0][0]).toBe(venueImage);
      expect(
        fillText.mock.calls.some(([text]) => text === character.venue.name.toUpperCase()),
      ).toBe(true);
      expect(fillText.mock.calls.some(([text]) => text === character.name.toUpperCase())).toBe(
        true,
      );
    }
  });
});
