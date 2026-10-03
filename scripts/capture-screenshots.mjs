/* Start `npx vite --mode test --port 4173` before running this capture. */
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const origin = process.env.GAME_URL ?? 'http://127.0.0.1:4173';
await mkdir('docs/screenshots', { recursive: true });
await mkdir('public/guide', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const classic = new URL(origin);
classic.searchParams.set('classic', '');
await page.goto(classic.href);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: 'docs/screenshots/play-mobile.png', fullPage: true });
for (const [name, file] of [
  ['Career', 'career'],
  ['Legends', 'legends'],
  ['Shop', 'shop'],
]) {
  await page.getByRole('navigation').getByRole('button', { name, exact: true }).click();
  await page.screenshot({ path: `docs/screenshots/${file}-mobile.png`, fullPage: true });
}
await page
  .getByRole('navigation')
  .getByRole('button', { name: 'How to Play', exact: true })
  .click();
for (let i = 0; i < 8; i++) {
  await page.getByRole('button', { name: `Guide page ${i + 1}`, exact: true }).click();
  await page.waitForTimeout(500);
  await page.locator('.guide-image').screenshot({ path: `public/guide/step-${i + 1}.png` });
}
await page.evaluate(() => window.keepyTest.startRun('practice', true));
await page.waitForTimeout(4200);
await page.screenshot({ path: 'docs/screenshots/game-mobile.png' });
await page.evaluate(() => window.keepyTest.actions.leave());
await page.setViewportSize({ width: 1440, height: 1100 });
await page.screenshot({ path: 'docs/screenshots/play-desktop.png', fullPage: true });
await browser.close();
console.log(
  'Captured the finished UI and eight playbook scenes. Rebuild to cache new guide assets.',
);
