import { test, expect, type Page } from '@playwright/test';

const INTRO_KEY = 'expert-pundit-keepyuppy-focus-intro-v1';
const SAVE_KEY = 'expert-pundit-keepyuppy-focus-v2';

declare global {
  interface Window {
    focusQA: { tick: (seconds: number, step?: number) => void; plays: number; pauses: number };
  }
}

/** Control only browser time/media; exercise the actual UI, renderer and simulation. */
async function prepare(
  page: Page,
  options: { first?: boolean; blocked?: boolean; anonymous?: boolean } = {},
) {
  await page.addInitScript(
    ({ seen, blocked, introKey }) => {
      if (seen) localStorage.setItem(introKey, 'seen');
      let now = 0;
      const frames: FrameRequestCallback[] = [];
      performance.now = () => now;
      window.requestAnimationFrame = (callback) => frames.push(callback);
      window.focusQA = {
        plays: 0,
        pauses: 0,
        tick(seconds, step = 0.1) {
          let remaining = seconds;
          do {
            const elapsed = Math.min(step, remaining);
            now += elapsed * 1000;
            remaining -= elapsed;
            for (const callback of frames.splice(0)) callback(now);
          } while (remaining > 1e-8);
        },
      };
      HTMLMediaElement.prototype.play = function () {
        window.focusQA.plays++;
        if (blocked) return Promise.reject(new DOMException('Autoplay blocked', 'NotAllowedError'));
        Object.defineProperty(this, 'paused', { value: false, configurable: true });
        return Promise.resolve();
      };
      HTMLMediaElement.prototype.pause = function () {
        window.focusQA.pauses++;
        Object.defineProperty(this, 'paused', { value: true, configurable: true });
      };
    },
    { seen: !options.first, blocked: !!options.blocked, introKey: INTRO_KEY },
  );
  await page.goto('/');
  await expect(page.locator('body')).toHaveAttribute('data-focus-ready', 'true');
  await expect(page.getByRole('link', { name: 'Created by Adrian Dane' })).toHaveAttribute(
    'href',
    'https://whatchan.co.uk/about-whatchan-adrian-dane#stat-man',
  );
  await tick(page, 0);
  if (!options.anonymous) await choose(page, '#focus-name', 'TESTER');
}
async function tick(page: Page, seconds: number, step = 0.1) {
  await page.evaluate(({ seconds, step }) => window.focusQA.tick(seconds, step), { seconds, step });
}
async function press(page: Page, selector: string) {
  // Native click activates the real handler without Playwright's animation-frame
  // stability wait, because requestAnimationFrame is deliberately controlled.
  await page.locator(selector).evaluate((element) => (element as HTMLElement).click());
  await tick(page, 0);
}
async function choose(page: Page, selector: string, value: string) {
  await page.locator(selector).evaluate((element, value) => {
    (element as HTMLSelectElement).value = value;
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await tick(page, 0);
}
async function tap(page: Page) {
  await page.locator('#focus-stage').dispatchEvent('pointerdown');
  await tick(page, 0);
}
async function save(page: Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), SAVE_KEY);
}

// Media playback is mocked in these interaction tests. Actual H.264 playback,
// sound, complete composition and device behavior require the trailer review.
test('first visit opens only the selected trailer; sound, skip, return and replay work', async ({
  page,
}) => {
  await prepare(page, { first: true });
  const cinema = page.getByRole('dialog', { name: 'KeepyUppy trailer' });
  await expect(cinema).toBeVisible();
  await expect(cinema.locator('video')).toHaveAttribute('src', /portrait\.mp4$/);
  expect(await cinema.locator('video').evaluate((video) => (video as HTMLVideoElement).muted)).toBe(
    true,
  );
  await press(page, '[data-action="sound"]');
  await expect(cinema.getByRole('button', { name: 'Sound off', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await press(page, '[data-action="skip"]');
  await expect(cinema).toBeHidden();
  expect(await page.evaluate((key) => localStorage.getItem(key), INTRO_KEY)).toBe('seen');
  await page.reload();
  await expect(page.locator('body')).toHaveAttribute('data-focus-ready', 'true');
  await expect(page.locator('.focus-presentation')).toBeHidden();
  await press(page, '#focus-trailer');
  await expect(cinema).toBeVisible();
  await cinema.locator('video').dispatchEvent('ended');
  await expect(cinema.getByRole('button', { name: 'Watch again', exact: true })).toBeVisible();
  await press(page, '[data-action="play"]');
  await expect(cinema).toBeHidden();
  await expect(page.locator('#focus-overlay')).toBeHidden();
  await expect(page.locator('#focus-name')).toBeDisabled();
});

test('landscape framing, blocked autoplay and media failure retain usable controls', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await prepare(page, { first: true, blocked: true });
  const cinema = page.getByRole('dialog', { name: 'KeepyUppy trailer' });
  await expect(cinema.locator('video')).toHaveAttribute('src', /landscape\.mp4$/);
  await expect(cinema.getByRole('status')).toContainText('Tap Watch trailer');
  await press(page, '[data-action="replay"]');
  expect(await page.evaluate(() => window.focusQA.plays)).toBeGreaterThanOrEqual(2);
  await cinema.locator('video').dispatchEvent('error');
  await expect(cinema.getByRole('status')).toContainText('Trailer unavailable');
  await expect(cinema.getByRole('button', { name: 'Retry trailer' })).toBeVisible();
  await press(page, '[data-action="play"]');
  await expect(page.locator('#focus-overlay')).toBeHidden();
});

test('reduced motion requires manual trailer playback and uses static attract cards', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await prepare(page, { first: true });
  expect(await page.evaluate(() => window.focusQA.plays)).toBe(0);
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('when ready');
  await press(page, '[data-action="replay"]');
  expect(await page.evaluate(() => window.focusQA.plays)).toBe(1);
  await press(page, '[data-action="skip"]');
  await tick(page, 45.1);
  await expect(page.getByRole('dialog', { name: 'KeepyUppy arcade demonstration' })).toBeVisible();
  await tick(page, 4.1);
  const before = await page
    .locator('.focus-attract-court canvas')
    .evaluate((canvas) => (canvas as HTMLCanvasElement).toDataURL());
  await tick(page, 2);
  expect(
    await page
      .locator('.focus-attract-court canvas')
      .evaluate((canvas) => (canvas as HTMLCanvasElement).toDataURL()),
  ).toBe(before);
});

test('attract mode waits 45 seconds, displays real boards and consumes dismissal safely', async ({
  page,
}) => {
  await prepare(page);
  await choose(page, '#focus-name', 'CHAMPION');
  await choose(page, '#focus-mode', 'endless');
  await choose(page, '#focus-duration', 'unlimited');
  await press(page, '#focus-start');
  await tick(page, 8.02, 0.01);
  await tap(page);
  await press(page, '#focus-finish');
  const before = await save(page);
  await tick(page, 60);
  await expect(page.locator('#focus-overlay')).toBeVisible();
  await expect(page.locator('.focus-presentation')).toBeHidden();
  await press(page, '#focus-menu');
  await tick(page, 44.9);
  await expect(page.locator('.focus-presentation')).toBeHidden();
  await tick(page, 0.2);
  await expect(page.getByRole('button', { name: 'Tap to play' })).toBeVisible();
  await tick(page, 16.1);
  await expect(page.locator('.focus-attract-card')).toContainText('CHAMPION · 300');
  await expect(page.locator('.focus-attract-card')).toContainText('ON THIS DEVICE');
  await page.locator('.focus-tap').dispatchEvent('pointerdown');
  // A pointer dismissal's later click must not activate an underlying start button.
  await press(page, '#focus-start');
  await expect(page.locator('.focus-presentation')).toBeHidden();
  await expect(page.locator('#focus-overlay')).toBeVisible();
  expect(await save(page)).toEqual(before);
  await tick(page, 45.1);
  await page.keyboard.press('Space');
  await expect(page.locator('.focus-presentation')).toBeHidden();
  await expect(page.locator('#focus-overlay')).toBeVisible();
  expect(await save(page)).toEqual(before);
});

test('attract mode never interrupts name editing, trailer, active or paused play, and toggle persists', async ({
  page,
}) => {
  await prepare(page);
  await page.locator('#focus-name').focus();
  await tick(page, 46);
  await expect(page.locator('.focus-presentation')).toBeHidden();
  await page.locator('#focus-name').blur();
  await press(page, '#focus-trailer');
  await tick(page, 46);
  await expect(page.getByRole('dialog', { name: 'KeepyUppy trailer' })).toBeVisible();
  await press(page, '[data-action="skip"]');
  await choose(page, '#focus-mode', 'practice');
  await press(page, '#focus-start');
  await tick(page, 46);
  await expect(page.locator('.focus-presentation')).toBeHidden();
  await press(page, '#focus-pause');
  await tick(page, 46);
  await expect(page.locator('.focus-presentation')).toBeHidden();
  await press(page, '#focus-finish');
  await press(page, '#focus-attract-enabled');
  await tick(page, 46);
  await expect(page.locator('.focus-presentation')).toBeHidden();
  await page.reload();
  await expect(page.locator('#focus-attract-enabled')).not.toBeChecked();
});

test('timed run pauses without consuming time, excludes early failures and banks Unlimited by name', async ({
  page,
}) => {
  await prepare(page);
  await expect(page.locator('#focus-mode')).toHaveValue('levels');
  await choose(page, '#focus-name', 'ALEX');
  await choose(page, '#focus-mode', 'endless');
  await expect(page.locator('#focus-duration')).toHaveValue('2-minutes');
  await press(page, '#focus-start');
  await tick(page, 8.02, 0.01);
  await tap(page);
  await expect(page.locator('#focus-score')).toHaveText('300');
  await press(page, '#focus-pause');
  const clock = await page.locator('#focus-goal').textContent();
  await tick(page, 60);
  await expect(page.locator('#focus-goal')).toHaveText(clock!);
  await press(page, '#focus-pause');
  await tick(page, 1);
  await tap(page);
  await expect(page.locator('#focus-score')).toHaveText('300');
  await expect(page.locator('#focus-goal')).toHaveText(clock!);
  await tick(page, 10);
  await expect(page.locator('#focus-overlay h1')).toHaveText('BALL DROPPED');
  await expect(page.locator('#focus-intro')).toContainText('Complete the full duration');
  await expect(page.locator('#focus-board')).toContainText('Set the first record');
  await press(page, '#focus-menu');
  await choose(page, '#focus-duration', 'unlimited');
  await press(page, '#focus-start');
  await tick(page, 8.02, 0.01);
  await tap(page);
  await press(page, '#focus-finish');
  await expect(page.locator('#focus-board')).toContainText('ALEX');
  await expect(page.locator('#focus-intro')).toContainText('PERSONAL BEST');
  await expect(page.locator('#focus-intro')).toContainText('NEW BOARD LEADER');
  const stored = await save(page);
  expect(stored.boards['standard:skills:ronaldinho:unlimited']).toHaveLength(1);
  await tick(page, 1);
  expect(await save(page)).toEqual(stored);
  await press(page, '#focus-menu');
  await choose(page, '#focus-duration', '5-minutes');
  await expect(page.locator('#focus-board')).toContainText('Set the first record');
  await expect(page.locator('#focus-goal')).toContainText('5:00 LEFT');
});

for (const [duration, deadline] of [
  ['2-minutes', 120],
  ['5-minutes', 300],
] as const) {
  test(`${duration} completes at its simulation deadline and rejects further score input`, async ({
    page,
  }) => {
    test.setTimeout(90000);
    await prepare(page);
    await choose(page, '#focus-mode', 'endless');
    await choose(page, '#focus-duration', duration);
    await press(page, '#focus-start');
    await page.evaluate((deadline) => {
      const tap = () => {
        document
          .getElementById('focus-stage')!
          .dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        window.focusQA.tick(0);
      };
      window.focusQA.tick(8.02, 0.01);
      tap();
      let elapsed = 5;
      for (let hits = 1; ; hits++) {
        const flight = 5 - 2.1 * Math.max(0, Math.min(1, (hits - 4) / 36));
        if (elapsed + flight >= deadline) break;
        window.focusQA.tick(flight);
        tap();
        elapsed += flight;
      }
      window.focusQA.tick(deadline - elapsed + 0.1);
    }, deadline);
    await expect(page.locator('#focus-overlay h1')).toHaveText('CHALLENGE COMPLETE!');
    await expect(page.locator('#focus-goal')).toContainText('0:00 LEFT');
    const score = await page.locator('#focus-score').textContent();
    await tap(page);
    await tick(page, 2);
    await expect(page.locator('#focus-score')).toHaveText(score!);
    const stored = await save(page);
    expect(stored.boards[`standard:skills:ronaldinho:${duration}`]).toHaveLength(1);
    expect(stored.boards[`standard:skills:ronaldinho:${duration}`][0]).toMatchObject({
      elapsed: deadline,
      completed: true,
    });
  });
}

test('tour resolves all attempts, holds its summary, then changes character and venue', async ({
  page,
}) => {
  await prepare(page);
  await expect(page.locator('#focus-goal')).toContainText('0 / 12 ATTEMPTS COMPLETE');
  await expect(page.locator('#focus-skill')).toContainText('Samba touch');
  await expect(page.locator('#focus-stage')).toHaveAttribute('data-venue', 'court');
  await press(page, '#focus-start');
  await tick(page, 8.02, 0.01);
  await tap(page);
  for (let hits = 1; hits < 12; hits++) {
    const flight = 5 - 2.1 * Math.min(1, (Math.max(0, hits - 4) / 6) * 0.12);
    await tick(page, flight);
    if (hits === 11) {
      await expect(page.locator('#focus-goal-detail')).toContainText('FINAL ATTEMPT');
      await expect(page.locator('#focus-overlay')).toBeHidden();
    }
    await tap(page);
    if (hits === 5) {
      await expect(page.locator('#focus-goal-detail')).toContainText('Target reached');
      await expect(page.locator('#focus-overlay')).toBeHidden();
    }
  }
  await expect(page.getByRole('dialog', { name: 'ROUND COMPLETE!' })).toBeVisible();
  await expect(page.locator('#focus-intro')).toContainText('12 / 12 attempts completed');
  await expect(page.locator('#focus-intro')).toContainText('Jay-Jay Okocha unlocked');
  await expect(page.locator('#focus-next')).toContainText('JAY-JAY OKOCHA');
  await expect(page.locator('#focus-results-table')).toContainText('TESTER');
  await expect(page.locator('#focus-results-table tr[aria-current="true"]')).toContainText(
    '22,500',
  );
  await expect(page.locator('#focus-results-rank')).toContainText('#1 on this level');
  await expect(page.locator('#focus-results-best')).toContainText('YOUR BEST: 22,500');
  const stored = await save(page);
  expect(stored.boards['standard:attempts:1'][0]).toMatchObject({
    hits: 12,
    character: 'ronaldinho',
    stars: 5,
  });
  await tick(page, 65);
  await expect(page.getByRole('dialog', { name: 'ROUND COMPLETE!' })).toBeVisible();
  await expect(page.locator('.focus-presentation')).toBeHidden();
  expect(await save(page)).toEqual(stored);
  await press(page, '#focus-next');
  await expect(page.locator('#focus-overlay')).toBeHidden();
  await expect(page.locator('#focus-stage-select')).toHaveValue('2');
  await expect(page.locator('#focus-goal')).toContainText('ROUND 2 · 0 / 14 ATTEMPTS COMPLETE');
  await expect(page.locator('#focus-skill')).toContainText('Rainbow control');
  await expect(page.locator('#focus-stage')).toHaveAttribute('data-venue', 'beach');
  await press(page, '#focus-finish');
  await press(page, '#focus-menu');
  await choose(page, '#focus-mode', 'practice');
  await choose(page, '#focus-character', 'okocha');
  await expect(page.locator('#focus-overlay h1')).toHaveText('JAY-JAY OKOCHA');
  await expect(page.locator('#focus-stage')).toHaveAttribute('data-venue', 'beach');
  await page.reload();
  await expect(page.locator('body')).toHaveAttribute('data-focus-ready', 'true');
  await expect(page.locator('#focus-stage-select')).toHaveValue('2');
  await expect(page.locator('#focus-character option[value="okocha"]')).toHaveJSProperty(
    'disabled',
    false,
  );
});

test('tour pause preserves attempts and missed targets show a retry summary without unlocking', async ({
  page,
}) => {
  await prepare(page);
  await press(page, '#focus-start');
  await tick(page, 10);
  await expect(page.locator('#focus-overlay')).toBeHidden();
  await press(page, '#focus-pause');
  const clock = await page.locator('#focus-goal').textContent();
  await tick(page, 60);
  await expect(page.locator('#focus-goal')).toHaveText(clock!);
  await press(page, '#focus-pause');
  await tick(page, 85);
  await expect(page.getByRole('dialog', { name: 'ROUND FINISHED!' })).toBeVisible();
  await expect(page.locator('#focus-intro')).toContainText('Target missed by 6 touches');
  await expect(page.locator('#focus-next')).toBeHidden();
  // State matchers follow the enclosing label to its select. Check the option itself.
  await expect(page.locator('#focus-character option[value="okocha"]')).toHaveJSProperty(
    'disabled',
    true,
  );
  await expect(page.locator('#focus-board')).toContainText('Set the first record');
  await page.keyboard.press('Tab');
  await expect(page.locator('#focus-start')).toBeFocused();
});

test('a name is required for each play entry point and survives a reload once entered', async ({
  page,
}) => {
  await prepare(page, { first: true, anonymous: true });
  await press(page, '[data-action="play"]');
  await expect(page.locator('#focus-overlay')).toBeVisible();
  await expect(page.locator('#focus-name')).toBeFocused();
  await expect(page.locator('#focus-name')).toHaveAttribute('aria-invalid', 'true');
  for (const mode of ['levels', 'endless', 'practice']) {
    await choose(page, '#focus-mode', mode);
    await choose(page, '#focus-name', '   ---  ');
    await press(page, '#focus-start');
    await expect(page.locator('#focus-overlay')).toBeVisible();
    await expect(page.locator('#focus-name-hint')).toContainText('Please enter your name');
    await expect(page.locator('#focus-name')).toBeFocused();
  }
  // Exercise the current input value even without blur/change committing it.
  await page.locator('#focus-name').fill('  Alex  ');
  await press(page, '#focus-start');
  await expect(page.locator('#focus-overlay')).toBeHidden();
  await expect(page.locator('#focus-name')).toHaveValue('Alex');
  await expect(page.locator('#focus-name')).toBeDisabled();
  await press(page, '#focus-finish');
  await expect(page.locator('#focus-results-board')).toBeHidden();
  await page.reload();
  await expect(page.locator('body')).toHaveAttribute('data-focus-ready', 'true');
  await expect(page.locator('#focus-name')).toHaveValue('Alex');
  await press(page, '#focus-start');
  await expect(page.locator('#focus-overlay')).toBeHidden();
});
