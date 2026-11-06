// Фоновая музыка для ролика: список треков Mixkit (Free License, без указания авторства) и загрузка кандидатов.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const OUT = 'music';
const log = (...a) => console.log('[music]', ...a);
await mkdir(OUT, { recursive: true });
const PAGES = [
  'https://mixkit.co/free-stock-music/tag/corporate/',
  'https://mixkit.co/free-stock-music/tag/corporate/?page=2',
  'https://mixkit.co/free-stock-music/tag/corporate/?page=3',
  'https://mixkit.co/free-stock-music/tag/technology/',
  'https://mixkit.co/free-stock-music/tag/background/',
  'https://mixkit.co/free-stock-music/ambient/',
  'https://mixkit.co/free-stock-music/tag/inspiring/',
];
const browser = await chromium.launch();
const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36', locale: 'en-US' });
const page = await ctx.newPage();
const tracks = new Map();
let dumped = false;
for (const url of PAGES) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(2500);
  } catch (e) { log('не открылась', url, e.message.split('\n')[0]); continue; }
  if (!dumped) { await writeFile(`${OUT}/page.html`, (await page.content()).slice(0, 400000)); dumped = true; }
  const items = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('*')) {
      for (const a of el.attributes) {
        if (!/\.mp3(\?|$)/i.test(a.value)) continue;
        let card = el;
        for (let i = 0; i < 6 && card.parentElement; i++) {
          card = card.parentElement;
          if ((card.innerText || '').length > 25) break;
        }
        out.push({ attr: a.name, url: a.value, text: (card.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 240) });
      }
    }
    return out;
  });
  log(url, 'треков', items.length);
  for (const it of items) if (!tracks.has(it.url)) tracks.set(it.url, { ...it, from: url });
}
const list = [...tracks.values()].map((t) => {
  const m = t.text.match(/(\d+):(\d\d)/);
  return { ...t, sec: m ? Number(m[1]) * 60 + Number(m[2]) : null };
});
await writeFile(`${OUT}/list.json`, JSON.stringify(list, null, 2));
log('всего', list.length);
// кандидаты: длинные (от 3 минут), без явных клубных жанров
const skip = /techno|house|funk|trap|hip|rap|rock|metal|dubstep|fest|party|romantic|love|vox/i;
const picks = list.filter((t) => t.sec && t.sec >= 180 && !skip.test(t.text)).slice(0, 14);
let n = 0;
for (const t of picks) {
  try {
    const r = await ctx.request.get(t.url, { timeout: 60000 });
    if (!r.ok()) { log('ошибка', r.status(), t.url); continue; }
    const name = `${String(++n).padStart(2, '0')}-${t.text.slice(0, 40).replace(/[^\w]+/g, '_')}.mp3`;
    await writeFile(`${OUT}/${name}`, await r.body());
    t.file = name;
    log('скачан', name, t.sec, 'с');
  } catch (e) { log('ошибка', e.message.split('\n')[0]); }
}
await writeFile(`${OUT}/picks.json`, JSON.stringify(picks, null, 2));
await browser.close();
