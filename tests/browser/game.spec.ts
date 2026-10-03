import { test, expect, type Page } from '@playwright/test';
async function start(page: Page, mode = 'practice') {
  // Keep the contact window still while browser input is delivered. Real-time
  // scrolling/actionability checks can otherwise outlast the 155ms window in CI.
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.goto('/?classic');
  await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
  await page.evaluate(async (m) => {
    await (window as any).keepyTest.startRun(m, true);
  }, mode);
  await page.clock.runFor(3200);
  await expect(page.locator('#court canvas:visible')).toBeVisible();
}
test('menus fit phone, tablet, desktop and narrow phone layouts', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?classic');
    for (const name of ['Play', 'Career', 'Legends', 'Shop', 'How to Play']) {
      await page.getByRole('navigation').getByRole('button', { name, exact: true }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await expect(page.locator('h1')).toBeVisible();
    }
  }
  expect(errors).toEqual([]);
});
test('mouse and keyboard input make contacts, and holding Space does not repeat', async ({
  page,
}) => {
  await start(page);
  await page.evaluate(() => {
    const w = (window as any).keepyTest;
    w.sim.main.due = w.sim.time + 0.02;
    w.sim.main.y = 490;
    w.sim.main.vy = 150;
  });
  await page.locator('#court').click();
  await expect(page.locator('#touches')).toContainText('1 TOUCHES');
  await page.clock.runFor(300);
  await page.evaluate(() => {
    const s = (window as any).keepyTest.sim;
    s.main.due = s.time + 0.02;
    s.main.y = 490;
    s.main.vy = 150;
  });
  await page.keyboard.down('Space');
  await expect(page.locator('#touches')).toContainText('2 TOUCHES');
  await page.clock.runFor(300);
  const feedback = await page.evaluate(() => (window as any).keepyTest.sim.feedback.serial);
  // A second down without keyup is a repeat event, as when holding the key.
  await page.keyboard.down('Space');
  expect(await page.evaluate(() => (window as any).keepyTest.sim.feedback.serial)).toBe(feedback);
  await page.keyboard.up('Space');
  expect(await page.evaluate(() => (window as any).keepyTest.sim.hits)).toBe(2);
});
test('touch input works, rotation preserves timing, and pause freezes simulation', async ({
  page,
  browserName,
}) => {
  test.skip(browserName === 'firefox', 'Firefox desktop emulation has no touchscreen');
  await start(page);
  await page.evaluate(() => {
    const s = (window as any).keepyTest.sim;
    s.main.due = s.time + 0.03;
    s.main.y = 490;
    s.main.vy = 150;
  });
  await page.locator('#court').tap();
  await expect(page.locator('#touches')).toContainText('1 TOUCHES');
  await page.getByRole('button', { name: 'Pause game' }).click();
  const before = await page.evaluate(() => (window as any).keepyTest.sim.time);
  await page.clock.runFor(600);
  expect(await page.evaluate(() => (window as any).keepyTest.sim.time)).toBe(before);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.getByRole('button', { name: 'BACK TO THE COURT' }).click();
  await page.clock.runFor(300);
  expect(await page.evaluate(() => (window as any).keepyTest.sim.time)).toBe(before);
});
test('settings survive reload with music off initially, accessible dialogs, and reduced effects', async ({
  page,
}) => {
  await page.goto('/?classic');
  await page.getByRole('button', { name: 'Settings and save backups' }).click();
  await expect(page.getByLabel('Background music')).not.toBeChecked();
  await page.getByLabel('Reduced effects').check();
  await page.getByLabel('Sound effects').uncheck();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Settings and save backups' }).click();
  await expect(page.getByLabel('Reduced effects')).toBeChecked();
  await expect(page.getByLabel('Sound effects')).not.toBeChecked();
});
test('unavailable storage shows a session-only notice without preventing play', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('denied');
      },
    }),
  );
  await page.goto('/?classic');
  await expect(page.locator('.storage-notice')).toContainText('Session only');
  await page.getByRole('button', { name: 'LET’S PLAY' }).click();
  await page.getByRole('button', { name: 'FIND MY RHYTHM' }).click();
  await expect(page.locator('#court canvas:visible')).toBeVisible();
});
test('all character and venue assets decode before a run', async ({ page }) => {
  await page.goto('/?classic');
  const broken = await page.evaluate(async () => {
    const ids = [
      'ronaldinho',
      'okocha',
      'baggio',
      'best',
      'cruyff',
      'zidane',
      'pele',
      'maradona',
      'henry',
      'ronaldo',
      'messi',
      'cristiano',
      'court',
      'beach',
      'rooftop',
      'cage',
      'training',
      'stadium',
    ];
    const result = await Promise.all(
      ids.map(async (id) => {
        const img = new Image();
        img.src = './art/' + id + '.webp';
        try {
          await img.decode();
          return null;
        } catch {
          return id;
        }
      }),
    );
    return result.filter(Boolean);
  });
  expect(broken).toEqual([]);
});
