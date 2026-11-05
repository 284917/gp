// Переход по личной ссылке амбассадора: настоящая страница карьерного сайта с UTM-меткой.
// Ссылка берётся из контент-кита демо-участника, страница снимается покадрово с плавной прокруткой.
import { chromium } from 'playwright';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT = 'video-clips';
const TMP = '/tmp/career-frames';
const FPS = 30;
const log = (...a) => console.log('[career]', ...a);
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
await mkdir(OUT, { recursive: true });
await rm(TMP, { recursive: true, force: true });
await mkdir(TMP, { recursive: true });

const browser = await chromium.launch();

// 1. личная ссылка из контент-кита
const kit = await browser.newContext({ viewport: { width: 1440, height: 810 }, locale: 'ru-RU' });
const pk = await kit.newPage();
let link = '';
for (const email of ['marina@demo.golos', 'alina@demo.golos']) {
  await pk.goto(`${BASE}/login`);
  await pk.fill('#email', email);
  await pk.fill('#password', 'golos2026');
  await pk.click('form button[type="submit"]:has-text("Войти")');
  await pk.waitForURL(/\/(me|status)/, { timeout: 8000 }).catch(() => {});
  if (!/\/me/.test(pk.url())) continue;
  await pk.goto(`${BASE}/me/kit`);
  await pk.locator('.my-link .tabs button', { hasText: 'VK' }).click();
  link = await pk.locator('.link-row input').inputValue();
  log('ссылка', email, link);
  break;
}
await kit.close();
if (!link) throw new Error('не удалось получить ссылку');

// 2. карьерный сайт по ссылке
const ctx = await browser.newContext({
  viewport: { width: 1350, height: 672 }, deviceScaleFactor: 4 / 3, locale: 'ru-RU', timezoneId: 'Europe/Moscow',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
});
const p = await ctx.newPage();
const resp = await p.goto(link, { waitUntil: 'load', timeout: 60000 }).catch((e) => { log('goto', e.message); return null; });
log('статус', resp?.status(), 'адрес', p.url());
await p.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
await p.waitForTimeout(2500);
await p.screenshot({ path: `${OUT}/career-raw.png` });

// баннер о cookie: отказываемся от необязательных, если есть такая кнопка; иначе прячем баннер только для съёмки
const banner = await p.evaluate(() => {
  const btns = [...document.querySelectorAll('button, a')].filter((b) => b.offsetParent && /cookie|куки|файлы cookie/i.test(b.closest('div,section,aside')?.innerText || ''));
  return btns.map((b) => b.innerText.trim()).slice(0, 6);
});
log('кнопки рядом с cookie', JSON.stringify(banner));
const decline = p.locator('button, a').filter({ hasText: /Отклонить|Только необходимые|Только обязательные|Отказаться/ }).first();
if (await decline.count() && await decline.isVisible().catch(() => false)) { await decline.click().catch(() => {}); await p.waitForTimeout(600); }
await p.evaluate(() => {
  for (const el of document.querySelectorAll('body *')) {
    const s = getComputedStyle(el);
    if ((s.position === 'fixed' || s.position === 'sticky') && /cookie|куки/i.test(el.innerText || '') && el.getBoundingClientRect().height < 400) el.style.display = 'none';
  }
});
await p.waitForTimeout(400);

const info = { link, finalUrl: p.url(), title: await p.title(), status: resp?.status() ?? null };
let n = 0;
const items = [];
const shot = async (dur = 1 / FPS) => {
  const file = `${TMP}/${String(++n).padStart(5, '0')}.jpg`;
  await p.screenshot({ path: file, type: 'jpeg', quality: 92 });
  items.push({ file, dur });
};
await shot(1.6);
const max = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
const target = Math.min(max, 560);
const frames = Math.round(3.2 * FPS);
for (let i = 1; i <= frames; i++) {
  await p.evaluate((y) => { document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, y); }, target * ease(i / frames));
  await shot();
}
await shot(1.4);
const list = ['ffconcat version 1.0'];
for (const it of items) list.push(`file '${it.file}'`, `duration ${it.dur.toFixed(5)}`);
list.push(`file '${items[items.length - 1].file}'`);
await writeFile(`${TMP}/list.txt`, list.join('\n'));
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', `${TMP}/list.txt`,
  '-vf', 'fps=30,scale=1800:896:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-crf', '14', '-preset', 'medium', '-r', '30', `${OUT}/career.mp4`]);
info.duration = items.reduce((a, b) => a + b.dur, 0);
await writeFile(`${OUT}/career.json`, JSON.stringify(info, null, 2));
log('готово', JSON.stringify(info));
await browser.close();
