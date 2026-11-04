// Скриншоты сайта для презентации: светлая тема, ретина, без анимаций.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT = 'deck-shots';
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const PW = 'golos2026';
const log = (...a) => console.log('[shots]', ...a);

async function ctx(opts = {}) {
  const c = await browser.newContext({
    viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'ru-RU', timezoneId: 'Europe/Moscow',
    colorScheme: 'light', reducedMotion: 'reduce', ...opts,
  });
  return c;
}
async function login(page, email) {
  await page.goto(`${BASE}/login`);
  await page.fill('#email', email);
  await page.fill('#password', PW);
  await Promise.all([page.waitForURL(/\/(me|curator)/), page.click('form button[type="submit"]:has-text("Войти")')]);
}
async function settle(page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((e) => e.classList.add('in')));
  await page.waitForTimeout(900);
}
async function view(page, name) {
  await settle(page);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  log(name);
}
async function full(page, name) {
  await settle(page);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  log(name);
}
async function el(page, selector, name) {
  await settle(page);
  const loc = page.locator(selector).first();
  if (!(await loc.count())) { log('нет элемента', selector, name); return; }
  await loc.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await loc.screenshot({ path: `${OUT}/${name}.png` });
  log(name);
}
const run = async (label, fn) => { try { await fn(); } catch (e) { console.error('[shots] FAIL', label, e.message); } };

// Публичная часть
await run('public', async () => {
  const c = await ctx();
  const p = await c.newPage();
  await p.goto(BASE);
  await view(p, 'landing-hero');
  await full(p, 'landing-full');
  await p.goto(`${BASE}/join`);
  await view(p, 'join');
  await c.close();
});

// Амбассадор АЗС: Алина, Омск
await run('alina', async () => {
  const c = await ctx();
  const p = await c.newPage();
  await login(p, 'alina@demo.golos');
  await view(p, 'alina-home');
  await full(p, 'alina-home-full');
  await p.goto(`${BASE}/me/tasks`);
  await view(p, 'alina-tasks');
  const shift = p.locator('a.task', { hasText: 'Кадр смены' }).first();
  await shift.click();
  await p.waitForURL(/\/me\/tasks\/\d+/);
  await view(p, 'alina-task-shift');
  await p.goto(`${BASE}/me/kit`);
  await view(p, 'alina-kit');
  await p.goto(`${BASE}/me/rewards`);
  await view(p, 'alina-rewards');
  await full(p, 'alina-rewards-full');
  await p.goto(`${BASE}/me/rating`);
  await view(p, 'alina-rating');
  await p.goto(`${BASE}/me/formats`);
  await view(p, 'formats');
  await full(p, 'formats-full');
  await el(p, '.flow-card', 'formats-flow');
  await el(p, '.igrid', 'formats-grid');
  // карточка формата, который повторили в другом регионе
  await p.goto(`${BASE}/me/formats`);
  const tile = p.locator('.igrid a', { hasText: 'Один день в профессии' }).first();
  if (await tile.count()) {
    await tile.click();
    await p.waitForURL(/\/me\/initiatives\/\d+/);
    await view(p, 'initiative-done');
    await full(p, 'initiative-done-full');
  }
  await c.close();
});

// Телефон: сотрудник АЗС сдаёт задание за 5 минут
await run('alina-mobile', async () => {
  const c = await ctx({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const p = await c.newPage();
  await login(p, 'alina@demo.golos');
  await view(p, 'm-alina-home');
  await p.goto(`${BASE}/me/tasks`);
  await view(p, 'm-alina-tasks');
  await p.locator('a.task', { hasText: 'Кадр смены' }).first().click();
  await p.waitForURL(/\/me\/tasks\/\d+/);
  await view(p, 'm-alina-task');
  await full(p, 'm-alina-task-full');
  await p.goto(`${BASE}/me/initiatives`);
  await view(p, 'm-initiatives');
  await c.close();
});

// Студент колледжа: Даниил, тандем с Алиной
await run('daniil', async () => {
  const c = await ctx();
  const p = await c.newPage();
  await login(p, 'daniil@demo.golos');
  await view(p, 'daniil-home');
  await p.goto(`${BASE}/me/initiatives`);
  await view(p, 'initiatives');
  await full(p, 'initiatives-full');
  await el(p, '.igrid', 'initiatives-grid');
  await p.goto(`${BASE}/me/rewards`);
  await view(p, 'daniil-rewards');
  await full(p, 'daniil-rewards-full');
  await c.close();
  const m = await ctx({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const mp = await m.newPage();
  await login(mp, 'daniil@demo.golos');
  await view(mp, 'm-daniil-home');
  await m.close();
});

// Капитан региона
await run('captain', async () => {
  const c = await ctx();
  const p = await c.newPage();
  await login(p, 'oleg@demo.golos');
  await p.goto(`${BASE}/me/review`);
  await view(p, 'captain-review');
  await c.close();
});

// Куратор
await run('curator', async () => {
  const c = await ctx();
  const p = await c.newPage();
  await login(p, 'kurator1@demo.golos');
  await view(p, 'curator-overview');
  await full(p, 'curator-overview-full');
  await el(p, 'section.community', 'curator-community');
  await el(p, '.rings', 'curator-rings');
  await p.goto(`${BASE}/curator/initiatives`);
  await view(p, 'curator-initiatives');
  await p.goto(`${BASE}/curator/regions`);
  await view(p, 'curator-regions');
  await el(p, '.card:has(svg.map)', 'curator-map');
  await p.goto(`${BASE}/curator/moderation?f=all`);
  await view(p, 'curator-moderation');
  await p.goto(`${BASE}/curator/metrics`);
  await view(p, 'curator-metrics');
  await c.close();
});

await browser.close();
log('готово');
