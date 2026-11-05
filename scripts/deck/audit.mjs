// Скриншоты для аудита сайта: компьютер и телефон, все ключевые экраны. Только CI, временная база.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT = 'audit-shots';
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const PW = 'golos2026';
const log = (...a) => console.log('[audit]', ...a);
const notes = [];

const DESK = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 };
const MOB = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true };

async function ctx(opts) {
  return browser.newContext({ locale: 'ru-RU', timezoneId: 'Europe/Moscow', reducedMotion: 'reduce', ...opts });
}
async function login(page, email) {
  await page.goto(`${BASE}/login`);
  await page.fill('#email', email);
  await page.fill('#password', PW);
  await Promise.all([page.waitForURL(/\/(me|curator)/), page.click('form button[type="submit"]:has-text("Войти")')]);
}
async function shot(page, name) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((e) => e.classList.add('in')));
  await page.waitForTimeout(700);
  const m = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth, h: document.documentElement.scrollHeight }));
  notes.push(`${name}\t${page.url().replace(BASE, '')}\twidth ${m.w}/${m.vw}\theight ${m.h}`);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  log(name);
}
async function pages(opts, prefix, email, list) {
  const c = await ctx(opts);
  const p = await c.newPage();
  p.on('pageerror', (e) => notes.push(`pageerror ${prefix} ${p.url()}: ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error') notes.push(`console ${prefix} ${p.url()}: ${m.text().slice(0, 200)}`); });
  if (email) await login(p, email);
  for (const [path, name] of list) {
    try {
      if (typeof path === 'function') await path(p); else await p.goto(`${BASE}${path}`);
      await shot(p, `${prefix}-${name}`);
    } catch (e) { notes.push(`FAIL ${prefix}-${name}: ${e.message.split('\n')[0]}`); }
  }
  await c.close();
}
const firstLink = (sel, re) => async (p) => {
  const href = await p.locator(sel).first().getAttribute('href');
  await p.goto(`${BASE}${href}`);
  if (re) await p.waitForURL(re);
};

for (const [opts, pre] of [[DESK, 'd'], [MOB, 'm']]) {
  await pages(opts, pre, null, [['/', 'landing'], ['/join', 'join'], ['/login', 'login'], ['/help?topic=access', 'help'], ['/nope', '404']]);
  await pages(opts, pre, 'alina@demo.golos', [
    ['/me', 'alina-home'], ['/me/tasks', 'alina-tasks'],
    [async (p) => { await p.goto(`${BASE}/me/tasks`); await firstLink('a.task')(p); }, 'alina-task'],
    ['/me/kit', 'alina-kit'], ['/me/rating', 'alina-rating'], ['/me/rewards', 'alina-rewards'], ['/me/profile', 'alina-profile'],
    ['/me/notifications', 'alina-notifications'], ['/me/initiatives', 'alina-initiatives'], ['/me/initiatives/new', 'alina-initiative-new'],
    ['/me/formats', 'alina-formats'],
    [async (p) => { await p.goto(`${BASE}/me/formats`); await firstLink('.igrid a')(p); }, 'alina-format-card'],
  ]);
  await pages(opts, pre, 'daniil@demo.golos', [['/me', 'daniil-home'], ['/me/rewards', 'daniil-rewards'], ['/me/tasks', 'daniil-tasks']]);
  await pages(opts, pre, 'oleg@demo.golos', [['/me/review', 'captain-review']]);
  await pages(opts, pre, 'kurator1@demo.golos', [
    ['/curator', 'cur-overview'], ['/curator/initiatives', 'cur-initiatives'], ['/curator/moderation', 'cur-moderation'],
    ['/curator/applications', 'cur-applications'], ['/curator/questions', 'cur-questions'], ['/curator/ambassadors', 'cur-ambassadors'],
    [async (p) => { await p.goto(`${BASE}/curator/ambassadors`); await firstLink('a.rowlink')(p); }, 'cur-ambassador'],
    ['/curator/tasks', 'cur-tasks'], ['/curator/tasks/new', 'cur-task-new'], ['/curator/rewards', 'cur-rewards'],
    ['/curator/regions', 'cur-regions'], ['/curator/metrics', 'cur-metrics'], ['/curator/account', 'cur-account'],
  ]);
}

await writeFile(`${OUT}/notes.txt`, notes.join('\n') + '\n');
await browser.close();
log('готово');
