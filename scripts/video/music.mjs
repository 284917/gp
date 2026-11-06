// Фоновая музыка: широкий список треков Mixkit (Free License) и короткие превью для выбора на слух.
import { chromium } from 'playwright';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const OUT = 'music2';
const log = (...a) => console.log('[music]', ...a);
await rm(OUT, { recursive: true, force: true });
await mkdir(`${OUT}/prev`, { recursive: true });
await mkdir('/tmp/mus', { recursive: true });
const TAGS = ['upbeat', 'happy', 'positive', 'piano', 'acoustic', 'guitar', 'motivational', 'inspiring', 'uplifting', 'hopeful',
  'lo-fi', 'chill', 'business', 'presentation', 'advertising', 'commercial', 'travel', 'summer', 'optimistic', 'corporate'];
const GENRES = ['pop', 'acoustic', 'chillout', 'lounge', 'jazz', 'funk', 'indie', 'folk', 'cinematic', 'soul'];
const PAGES = [...TAGS.map((t) => `https://mixkit.co/free-stock-music/tag/${t}/`), ...GENRES.map((g) => `https://mixkit.co/free-stock-music/${g}/`)];
const browser = await chromium.launch();
const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36', locale: 'en-US' });
const page = await ctx.newPage();
const tracks = new Map();
for (const url of PAGES) {
  try {
    const r = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 });
    if (!r || r.status() >= 400) { log('нет страницы', url, r?.status()); continue; }
    await page.waitForTimeout(1500);
  } catch (e) { log('не открылась', url); continue; }
  const items = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('*')) {
      for (const a of el.attributes) {
        if (!/\.mp3(\?|$)/i.test(a.value)) continue;
        let card = el;
        for (let i = 0; i < 6 && card.parentElement; i++) { card = card.parentElement; if ((card.innerText || '').length > 25) break; }
        out.push({ url: a.value, text: (card.innerText || '').replace(/\s+/g, ' ').replace(/ Download Free Music.*/, '').trim().slice(0, 200) });
      }
    }
    return out;
  });
  log(url, items.length);
  for (const it of items) {
    const prev = tracks.get(it.url);
    if (prev) prev.pages.push(url.split('/').slice(-2, -1)[0]);
    else tracks.set(it.url, { ...it, pages: [url.split('/').slice(-2, -1)[0]] });
  }
}
const all = [...tracks.values()].map((t) => {
  const m = t.text.match(/(\d+):(\d\d)$/);
  return { ...t, sec: m ? Number(m[1]) * 60 + Number(m[2]) : null };
});
await writeFile(`${OUT}/list.json`, JSON.stringify(all, null, 1));
log('всего', all.length);
const skip = /techno|house|trap|rap|hip hop|metal|dubstep|disturbing|restless|weird|sexy|sensual|romantic|horror|dark|mysterious|meditative|children|christmas|holiday/i;
const want = /positive|happy|uplifting|hopeful|inspiring|optimistic|friendly|upbeat|motivational|confident|cheerful|bright|piano|acoustic|guitar|corporate|lo-fi|chill|jazz|pop|folk|indie/i;
const picks = all.filter((t) => t.sec && t.sec >= 95 && !skip.test(t.text) && (want.test(t.text) || t.pages.some((p) => want.test(p))))
  .sort((a, b) => b.pages.length - a.pages.length).slice(0, 40);
let n = 0;
for (const t of picks) {
  try {
    const r = await ctx.request.get(t.url, { timeout: 60000 });
    if (!r.ok()) { log('ошибка', r.status()); continue; }
    const id = String(++n).padStart(2, '0');
    const src = `/tmp/mus/${id}.mp3`;
    await writeFile(src, await r.body());
    const ss = Math.round((t.sec || 120) * 0.3);
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-ss', String(ss), '-t', '24', '-i', src, '-af', 'afade=t=in:d=1,afade=t=out:st=23:d=1', '-c:a', 'aac', '-b:a', '128k', `${OUT}/prev/${id}.m4a`]);
    t.id = id;
    log('превью', id, t.sec, t.text.slice(0, 70));
  } catch (e) { log('ошибка', e.message.split('\n')[0]); }
}
await writeFile(`${OUT}/picks.json`, JSON.stringify(picks.filter((t) => t.id), null, 1));
await browser.close();
