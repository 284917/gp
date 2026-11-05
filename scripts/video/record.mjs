// Запись демо-ролика «сезон амбассадора» на временной базе с демо-данными.
// Каждый кадр — JPEG 1920×1080 (окно 1440×810 при масштабе 4/3), паузы — один кадр с длительностью.
// Курсор и касания рисуются на странице. Сцены кодируются в отдельные MP4, монтаж и подписи — отдельно.
import { chromium } from 'playwright';
import postgres from 'postgres';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT = 'video-clips';
const TMP = '/tmp/golos-frames';
const FPS = 30;
const DT = 1 / FPS;
const VIEW = { width: 1440, height: 810 };
const PW = 'golos2026';
const PHOTO = resolve('scripts/video/assets/kadr-smeny.jpg');
const INI = 'Экскурсия на АЗС для первокурсников';
const MARINA = { name: 'Марина Соколова', email: 'marina@demo.golos' };

const ONLY = (process.env.SCENES || '').split(',').filter(Boolean);
if (!ONLY.length) await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
await rm(TMP, { recursive: true, force: true });

const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, onnotice: () => {} });
const browser = await chromium.launch();
const manifest = ONLY.length ? JSON.parse(await (await import('node:fs/promises')).readFile(`${OUT}/manifest.json`, 'utf8').catch(() => '[]')) : [];
const log = (...a) => console.log('[video]', ...a);
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- курсор на странице ----------
const CURSOR = `(() => {
  if (window.top !== window) return;
  const ID = 'rec-cursor';
  const ARROW = '<svg width="30" height="30" viewBox="0 0 26 26"><path d="M4 2 L4 21.5 L9.2 16.8 L12.7 24.4 L16.3 22.8 L12.9 15.4 L19.8 15.4 Z" fill="#fff" stroke="#0b1a2c" stroke-width="1.5" stroke-linejoin="round"/></svg>';
  function make() {
    if (document.getElementById(ID)) return;
    const c = document.createElement('div');
    c.id = ID;
    c.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;will-change:left,top;filter:drop-shadow(0 3px 5px rgba(0,0,0,.45))';
    const r = document.createElement('div');
    r.id = ID + '-ring';
    r.style.cssText = 'position:fixed;left:0;top:0;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;border:3px solid #ff8240;background:rgba(255,130,64,.18);opacity:0;pointer-events:none;z-index:2147483646';
    document.documentElement.append(r, c);
    const s = JSON.parse(sessionStorage.getItem(ID) || '{"x":980,"y":520,"m":"arrow"}');
    window.__cur(s.x, s.y, s.m);
  }
  window.__cur = (x, y, m = 'arrow') => {
    const c = document.getElementById(ID);
    if (!c) return;
    if (c.dataset.m !== m) {
      c.dataset.m = m;
      c.innerHTML = m === 'touch'
        ? '<div style="width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;background:rgba(255,255,255,.35);border:2px solid rgba(255,255,255,.9)"></div>'
        : ARROW;
      c.style.marginLeft = m === 'touch' ? '0' : '-4px';
      c.style.marginTop = m === 'touch' ? '0' : '-2px';
    }
    c.style.left = x + 'px';
    c.style.top = y + 'px';
    sessionStorage.setItem(ID, JSON.stringify({ x, y, m }));
  };
  window.__ring = (x, y, k) => {
    const r = document.getElementById(ID + '-ring');
    if (!r) return;
    r.style.left = x + 'px';
    r.style.top = y + 'px';
    r.style.opacity = k >= 1 ? '0' : String(1 - k);
    r.style.transform = 'scale(' + (0.4 + k * 0.9) + ')';
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', make); else make();
})();`;

async function context(mobile = false) {
  const c = await browser.newContext({
    viewport: VIEW, deviceScaleFactor: 4 / 3, locale: 'ru-RU', timezoneId: 'Europe/Moscow', reducedMotion: 'reduce', colorScheme: 'dark',
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  await c.addInitScript(CURSOR);
  return c;
}
async function login(page, email) {
  await page.goto(`${BASE}/login`);
  await page.fill('#email', email);
  await page.fill('#password', PW);
  await Promise.all([page.waitForURL(/\/(me|curator|status)/), page.click('form button[type="submit"]:has-text("Войти")')]);
}
async function settle(page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  await page.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((e) => e.classList.add('in'))).catch(() => {});
  await sleep(250);
}

// ---------- запись сцены ----------
class Scene {
  constructor(name, page, { frame = null, touch = false } = {}) {
    this.name = name;
    this.page = page;
    this.frame = frame;
    this.touch = touch;
    this.items = [];
    this.n = 0;
    this.t = 0;
    this.marks = {};
    this.cur = { x: 980, y: 520 };
    this.dir = `${TMP}/${name}`;
  }
  get doc() { return this.frame ?? this.page; }
  async start(x = 980, y = 520) {
    await mkdir(this.dir, { recursive: true });
    await this.setCursor(x, y);
    log('сцена', this.name);
    return this;
  }
  mark(k) { this.marks[k] = +this.t.toFixed(3); }
  async shot(dur = DT) {
    const file = `${this.dir}/${String(++this.n).padStart(5, '0')}.jpg`;
    await this.page.screenshot({ path: file, type: 'jpeg', quality: 92 });
    this.items.push({ file, dur });
    this.t += dur;
  }
  async hold(sec) { await this.shot(sec); }
  async setCursor(x, y) {
    this.cur = { x, y };
    await this.page.evaluate(([x, y, m]) => window.__cur && window.__cur(x, y, m), [x, y, this.touch ? 'touch' : 'arrow']).catch(() => {});
  }
  async move(x, y, sec = 0.55) {
    const { x: x0, y: y0 } = this.cur;
    const dist = Math.hypot(x - x0, y - y0);
    const n = Math.max(1, Math.round(Math.min(sec, 0.25 + dist / 1800) * FPS));
    for (let i = 1; i <= n; i++) {
      const k = ease(i / n);
      await this.setCursor(x0 + (x - x0) * k, y0 + (y - y0) * k);
      await this.shot();
    }
  }
  async box(locator) {
    const b = await locator.boundingBox();
    if (!b) throw new Error(`${this.name}: элемент не виден`);
    return b;
  }
  async ensureVisible(locator, { top = 96, bottom = 70 } = {}) {
    const vh = this.frame ? 704 : VIEW.height;
    const r = await locator.evaluate((e) => { const b = e.getBoundingClientRect(); return { top: b.top, bottom: b.bottom }; });
    if (r.top >= top && r.bottom <= vh - bottom) return;
    const y0 = await this.doc.evaluate(() => window.scrollY);
    const target = Math.max(0, y0 + r.top - Math.max(top, (vh - (r.bottom - r.top)) * 0.38));
    await this.scrollTo(target, 0.55);
  }
  async scrollTo(y, sec = 1) {
    const y0 = await this.doc.evaluate(() => window.scrollY);
    const max = await this.doc.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    const y1 = Math.max(0, Math.min(max, y));
    const n = Math.max(1, Math.round(sec * FPS));
    for (let i = 1; i <= n; i++) {
      const yy = y0 + (y1 - y0) * ease(i / n);
      await this.doc.evaluate((v) => { document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, v); }, yy);
      await this.shot();
    }
  }
  async scrollToEl(locator, offset = 90, sec = 1) {
    const y = await locator.evaluate((e, off) => e.getBoundingClientRect().top + window.scrollY - off, offset);
    await this.scrollTo(y, sec);
  }
  async point(locator, { sec = 0.55, dx = 0.5, dy = 0.5 } = {}) {
    if (!(await locator.count())) { log('нет элемента для курсора в сцене', this.name); return; }
    await this.ensureVisible(locator);
    const b = await this.box(locator);
    await this.move(b.x + b.width * dx, b.y + b.height * dy, sec);
  }
  async ripple() {
    const { x, y } = this.cur;
    for (let i = 0; i <= 6; i++) {
      await this.page.evaluate(([x, y, k]) => window.__ring && window.__ring(x, y, k), [x, y, i / 6]);
      if (i < 6) await this.shot();
    }
  }
  async click(locator, { sec, dx, dy, wait } = {}) {
    await this.point(locator, { sec, dx, dy });
    await this.ripple();
    if (wait) await Promise.all([wait(), locator.click()]);
    else await locator.click();
    await settle(this.page);
    await this.setCursor(this.cur.x, this.cur.y);
  }
  async type(locator, text, { cps = 48, clear = false } = {}) {
    await this.click(locator, { sec: 0.45 });
    if (clear) { await locator.fill(''); await this.shot(); }
    const per = Math.max(1, Math.round(cps / FPS));
    for (let i = 0; i < text.length; i += per) {
      await this.page.keyboard.type(text.slice(i, i + per));
      await this.shot();
    }
  }
  async select(locator, value) {
    await this.click(locator, { sec: 0.45 });
    await locator.selectOption(value);
    await this.shot(0.25);
  }
  async zoom(locator, scale = 1.3, sec = 0.7) {
    const b = await locator.evaluate((e) => { const r = e.getBoundingClientRect(); return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 }; });
    const n = Math.round(sec * FPS);
    for (let i = 1; i <= n; i++) {
      const k = 1 + (scale - 1) * ease(i / n);
      await this.doc.evaluate(([cx, cy, k]) => { const m = document.querySelector('body'); m.style.transformOrigin = `${cx}px ${cy + window.scrollY}px`; m.style.transform = `scale(${k})`; }, [b.cx, b.cy, k]);
      await this.shot();
    }
  }
  async unzoom() { await this.doc.evaluate(() => { document.body.style.transform = ''; }); }
  async end() {
    const list = ['ffconcat version 1.0'];
    for (const it of this.items) list.push(`file '${it.file}'`, `duration ${it.dur.toFixed(5)}`);
    list.push(`file '${this.items[this.items.length - 1].file}'`);
    await writeFile(`${this.dir}/list.txt`, list.join('\n'));
    const tmp = `${OUT}/${this.name}.tmp.mp4`;
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', `${this.dir}/list.txt`,
      '-vf', 'fps=30,scale=1920:1080:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-crf', '14', '-preset', 'medium',
      '-r', '30', '-movflags', '+faststart', tmp]);
    execFileSync('mv', [tmp, `${OUT}/${this.name}.mp4`]);
    const entry = { name: this.name, duration: +this.t.toFixed(3), frames: this.n, marks: this.marks };
    const at = manifest.findIndex((m) => m.name === this.name);
    if (at >= 0) manifest[at] = entry; else manifest.push(entry);
    await writeFile(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 2));
    await rm(this.dir, { recursive: true, force: true });
    log('готово', this.name, this.t.toFixed(1), 'с');
  }
}
const scene = (name, page, opts) => new Scene(name, page, opts);
const run = async (label, fn) => {
  try { await fn(); } catch (e) { console.error('[video] FAIL', label, e.stack || e.message); process.exitCode = 1; }
};

// ---------- участники ----------
const anon = await context();
const pA = await anon.newPage();                 // Марина: главная, заявка, затем её кабинет
const curCtx = await context();
const pC = await curCtx.newPage();
await login(pC, 'kurator1@demo.golos');
const danCtx = await context();
const pD = await danCtx.newPage();
await login(pD, 'daniil@demo.golos');

// 1. Программа: главная страница целиком
await run('landing', async () => {
  await pA.goto(BASE);
  await settle(pA);
  const s = await scene('01-landing', pA).start(1010, 610);
  await s.hold(1.3);
  await s.move(1120, 470, 0.8);
  await s.hold(0.7);
  s.mark('who');
  await s.scrollToEl(pA.locator('#who'), 80, 1.0);
  await s.move(560, 560, 0.6);
  await s.hold(1.6);
  s.mark('initiatives');
  await s.scrollToEl(pA.locator('#initiatives'), 80, 1.0);
  await s.move(720, 540, 0.5);
  await s.hold(1.3);
  await s.scrollToEl(pA.locator('section.tagline'), 120, 0.9);
  await s.hold(1.2);
  s.mark('regions');
  await s.scrollToEl(pA.locator('.landing-flow'), 90, 1.0);
  await s.move(900, 560, 0.6);
  await s.hold(1.8);
  s.mark('path');
  await s.scrollToEl(pA.locator('#path'), 70, 1.0);
  await s.move(950, 520, 0.5);
  await s.hold(1.3);
  await s.scrollToEl(pA.locator('#path .card').last(), 160, 0.8);
  await s.hold(1.0);
  await s.scrollToEl(pA.locator('ol.how'), 220, 0.8);
  await s.hold(1.2);
  s.mark('perks');
  await s.scrollToEl(pA.locator('#perks'), 70, 0.9);
  await s.move(820, 560, 0.5);
  await s.hold(1.3);
  await s.scrollToEl(pA.locator('section', { hasText: 'Четыре куратора на всю страну' }).first(), 140, 0.9);
  await s.hold(1.3);
  s.mark('faq');
  await s.scrollToEl(pA.locator('#faq'), 70, 0.9);
  await s.click(pA.locator('#faq summary', { hasText: 'Даёт ли программа' }));
  await s.hold(1.4);
  await s.scrollToEl(pA.locator('.cta-band'), 260, 0.9);
  await s.point(pA.locator('.cta-band a.btn'));
  await s.hold(1.2);
  await s.end();
});
if (ONLY.length && ONLY.every((n) => n === '01-landing')) {
  await browser.close();
  await sql.end();
  process.exit(process.exitCode ?? 0);
}

// 2. Заявка
await run('join', async () => {
  const s = await scene('02-join', pA).start(820, 600);
  await s.click(pA.locator('.site-head a.btn.primary'), { wait: () => pA.waitForURL(/\/join/) });
  await s.hold(0.7);
  s.mark('role');
  await s.click(pA.locator('label.seg-card', { hasText: 'АЗС и нефтебаза' }));
  s.mark('fields');
  await s.type(pA.locator('#name'), MARINA.name);
  await s.select(pA.locator('#region'), 'omsk');
  await s.type(pA.locator('#org'), 'АЗС № 118');
  await s.type(pA.locator('#position'), 'Оператор АЗС');
  await s.type(pA.locator('#email'), MARINA.email, { cps: 60 });
  await s.type(pA.locator('#password'), PW, { cps: 60 });
  s.mark('motivation');
  await s.type(pA.locator('#motivation'), 'Хочу показать студентам, что работа на АЗС — это люди, сервис и команда.', { cps: 75 });
  await s.click(pA.locator('input[name="consent"]'));
  s.mark('submit');
  await s.click(pA.locator('button[type="submit"]:has-text("Отправить заявку")'), { wait: () => pA.waitForURL(/\/status/) });
  await pA.getByText('Заявка на рассмотрении').waitFor();
  await settle(pA);
  await s.move(760, 330, 0.5);
  await s.hold(1.6);
  await s.end();
});

// 3. Куратор принимает заявку
await run('approve', async () => {
  await pC.goto(`${BASE}/curator/applications`);
  await settle(pC);
  const s = await scene('03-approve', pC).start(900, 300);
  await s.hold(0.8);
  const card = pC.locator('article.mod', { hasText: MARINA.name });
  await s.point(card, { dy: 0.3 });
  await s.hold(0.7);
  await s.click(card.getByRole('button', { name: 'Принять в программу' }), { wait: () => card.waitFor({ state: 'detached', timeout: 15000 }) });
  await s.hold(1.8);
  await s.end();
});

// подготовка: тандем Марины — студенты колледжа из Омска
const [marina] = await sql`select id from users where email = ${MARINA.email}`;
await sql`update users set mentor_id = ${marina.id}
          where id in (select id from users where segment = 'college' and region_id = 'omsk' and status = 'active' and role = 'ambassador' order by (email = 'daniil@demo.golos') desc, id limit 2)`;

// 4. Кабинет
await run('cabinet', async () => {
  await pA.goto(`${BASE}/me`);
  await settle(pA);
  const s = await scene('04-cabinet', pA).start(760, 330);
  await s.hold(1.0);
  s.mark('level');
  await s.point(pA.locator('section.level'), { dx: 0.5, dy: 0.55 });
  await s.hold(1.3);
  s.mark('week');
  await s.point(pA.locator('a.task').first(), { dx: 0.3 });
  await s.hold(1.0);
  s.mark('tandem');
  await s.point(pA.locator('section.card', { hasText: 'Мой тандем' }), { dx: 0.4, dy: 0.45 });
  await s.hold(1.4);
  await s.end();
});

// 5. Задания: у сотрудника и у студента свои
await run('tasks', async () => {
  const s = await scene('05-tasks', pA).start(900, 300);
  await s.click(pA.locator('.amb-nav a', { hasText: 'Задания' }), { wait: () => pA.waitForURL(/\/me\/tasks$/) });
  await s.hold(0.8);
  const tasks = pA.locator('a.task');
  const count = Math.min(4, await tasks.count());
  for (let i = 0; i < count; i++) { await s.point(tasks.nth(i), { dx: 0.35, sec: 0.45 }); await s.hold(0.45); }
  await s.end();
  await pD.goto(`${BASE}/me/tasks`);
  await settle(pD);
  const d = await scene('05b-tasks-student', pD).start(700, 300);
  await d.hold(0.6);
  const dt = pD.locator('a.task');
  await d.point(dt.first(), { dx: 0.35 });
  await d.hold(0.7);
  await d.point(dt.nth(1), { dx: 0.35 });
  await d.hold(1.8);
  await d.end();
});

// 6. Задание с телефона: «Кадр смены»
await run('phone', async () => {
  const pS = await anon.newPage();
  await pS.goto(`${BASE}/studio.html`);
  const frame = pS.frame({ name: 'phone' });
  await frame.goto(`${BASE}/me/tasks`);
  await settle(pS);
  const s = await scene('06-phone-task', pS, { frame, touch: true }).start(1100, 500);
  await s.hold(1.0);
  await s.click(frame.locator('a.task', { hasText: 'Кадр смены' }), { wait: () => frame.waitForURL(/\/me\/tasks\/\d+/) });
  await settle(pS);
  await s.hold(1.0);
  s.mark('steps');
  await s.scrollTo(260, 0.9);
  await s.hold(1.4);
  s.mark('upload');
  const drop = frame.locator('label.drop');
  await s.point(drop);
  await s.ripple();
  await frame.locator('input[type="file"]').setInputFiles(PHOTO);
  for (let i = 0; i < 40; i++) {
    await s.shot();
    if (await frame.locator('label.drop.has').count()) break;
    await sleep(60);
  }
  await s.hold(0.6);
  s.mark('text');
  await s.click(frame.locator('.submit-box .tabs button', { hasText: 'Текст' }));
  await s.type(frame.locator('#body'), 'Утренняя смена на АЗС № 118: встречаем первых гостей.', { cps: 55 });
  s.mark('send');
  await s.click(frame.locator('button[type="submit"]:has-text("Отправить на проверку")'), { wait: () => frame.waitForURL(/sent=1/) });
  await frame.getByText('Задание отправлено').first().waitFor();
  await settle(pS);
  await s.hold(1.6);
  await s.end();
  await pS.close();
});

// 7. Проверка: съёмку на объекте смотрит куратор
await run('moderation', async () => {
  await pC.goto(`${BASE}/curator/moderation?f=flagged`);
  await settle(pC);
  const s = await scene('07-moderation', pC).start(900, 300);
  const card = pC.locator('article.mod', { hasText: MARINA.name });
  await s.ensureVisible(card, { top: 90, bottom: 40 });
  await s.point(card.locator('.media-prev'), { dy: 0.5 });
  await s.hold(1.4);
  await s.click(card.getByRole('button', { name: 'Принять' }), { wait: () => card.waitFor({ state: 'detached', timeout: 15000 }) });
  await s.hold(1.0);
  await s.end();
  await pA.goto(`${BASE}/me`);
  await settle(pA);
  const m = await scene('07b-points', pA).start(700, 300);
  await m.point(pA.locator('section.level .level-top'), { dx: 0.85 });
  await m.zoom(pA.locator('section.level'), 1.18, 0.6);
  await m.hold(2.4);
  await m.unzoom();
  await m.end();
});

// время идёт: два месяца заданий
await sql`update users set points = 640 where id = ${marina.id}`;

// 8. Награды
await run('rewards', async () => {
  await pA.goto(`${BASE}/me`);
  await settle(pA);
  const s = await scene('08-rewards', pA).start(700, 300);
  await s.point(pA.locator('section.level p').last(), { dx: 0.4 });
  await s.hold(1.8);
  s.mark('catalog');
  await s.click(pA.locator('.amb-nav a', { hasText: 'Награды' }), { wait: () => pA.waitForURL(/\/me\/rewards/) });
  await s.hold(0.9);
  await s.point(pA.locator('.status-card'), { dx: 0.3, dy: 0.4 });
  await s.hold(0.9);
  await s.scrollToEl(pA.locator('.grid-2').last(), 140, 0.9);
  await s.hold(1.0);
  s.mark('order');
  const hoodie = pA.locator('.rw', { hasText: 'Худи' });
  await s.click(hoodie.locator('summary'));
  await s.hold(0.4);
  await s.click(hoodie.locator('button[type="submit"]'), { wait: () => pA.waitForURL(/ok=/) });
  await settle(pA);
  await s.hold(1.4);
  await s.end();
  await pC.goto(`${BASE}/curator/rewards`);
  await settle(pC);
  const c = await scene('08b-rewards-curator', pC).start(900, 300);
  const card = pC.locator('article.mod', { hasText: MARINA.name });
  await c.point(card, { dy: 0.35 });
  await c.hold(0.6);
  await c.click(card.getByRole('button', { name: 'Выдано' }), { wait: () => card.waitFor({ state: 'detached', timeout: 15000 }) });
  await c.hold(1.4);
  await c.end();
});

// 9. Контент-кит
await run('kit', async () => {
  await pA.goto(`${BASE}/me/kit`);
  await settle(pA);
  const s = await scene('09-kit', pA).start(800, 300);
  await s.hold(0.7);
  s.mark('link');
  await s.click(pA.locator('.my-link .tabs button', { hasText: 'VK' }));
  await s.point(pA.locator('.link-row input'), { dx: 0.55 });
  await s.hold(0.6);
  await s.click(pA.locator('.link-row button'));
  await s.hold(0.8);
  s.mark('builder');
  await s.type(pA.locator('#k-what'), 'В метель у водителя сел аккумулятор — помогли завести машину и напоили чаем.', { cps: 80, clear: true });
  await s.point(pA.locator('pre.kit-out'), { dx: 0.5, dy: 0.5 });
  await s.hold(1.2);
  await s.click(pA.locator('section.card button', { hasText: 'Скопировать' }).last());
  await s.hold(0.8);
  await s.end();
});

// 10. Биржа инициатив: студент предлагает проект
let iniUrl = '';
await run('ini-propose', async () => {
  await pD.goto(`${BASE}/me/initiatives`);
  await settle(pD);
  const s = await scene('10-ini-propose', pD).start(900, 300);
  await s.hold(1.0);
  await s.click(pD.locator('a.btn', { hasText: 'Предложить инициативу' }).first(), { wait: () => pD.waitForURL(/\/me\/initiatives\/new/) });
  await s.hold(0.6);
  s.mark('form');
  await s.type(pD.locator('#i-title'), INI, { cps: 60 });
  await s.select(pD.locator('#i-format'), 'excursion');
  await s.type(pD.locator('#i-sum'), 'Покажем первокурсникам, как устроена смена на АЗС: экскурсия, разговор с оператором и вопросы о практике.', { cps: 95 });
  await s.type(pD.locator('#i-aud'), 'Первый курс нефтяного колледжа', { cps: 70 });
  await s.click(pD.locator('label.seg-toggle', { hasText: 'АЗС и нефтебаза' }));
  await s.click(pD.locator('label.seg-toggle', { hasText: 'Студент колледжа' }));
  await s.type(pD.locator('#i-roles'), 'Оператор ведёт экскурсию, студенты снимают ролик', { cps: 80 });
  await s.type(pD.locator('#i-goal'), 'Экскурсия для 20 студентов, ролик на минуту и инструкция для других регионов', { cps: 95 });
  await s.click(pD.locator('label.checkbox', { hasText: 'Будем снимать' }));
  s.mark('submit');
  await s.click(pD.locator('button[type="submit"]:has-text("Отправить на согласование")'), { wait: () => pD.waitForURL(/\/me\/initiatives\/\d+\?created=1/) });
  iniUrl = pD.url().split('?')[0];
  await settle(pD);
  await s.hold(1.4);
  await s.end();
});

// 11. Куратор согласует, Марина вступает в команду, автор собирает команду
await run('ini-team', async () => {
  await pC.goto(`${BASE}/curator/initiatives`);
  await settle(pC);
  const c = await scene('11-ini-approve', pC).start(900, 300);
  const card = pC.locator('article.mod', { hasText: INI });
  await c.ensureVisible(card, { top: 90, bottom: 40 });
  await c.point(card, { dy: 0.3 });
  await c.hold(0.7);
  await c.click(card.getByRole('button', { name: 'Согласовать' }), { wait: () => card.waitFor({ state: 'detached', timeout: 15000 }) });
  await c.hold(1.3);
  await c.end();

  await pA.goto(`${BASE}/me/initiatives`);
  await settle(pA);
  const m = await scene('12-ini-join', pA).start(900, 300);
  const tile = pA.locator('a.itile', { hasText: INI });
  await m.point(tile);
  await m.hold(0.6);
  await m.click(tile, { wait: () => pA.waitForURL(/\/me\/initiatives\/\d+$/) });
  await m.hold(0.8);
  await m.type(pA.locator('#j-note'), 'Шесть лет работаю оператором — проведу экскурсию и покажу смену.', { cps: 85 });
  await m.click(pA.locator('button[type="submit"]:has-text("Хочу в команду")'));
  await pA.getByText('Отклик отправлен').first().waitFor();
  await m.hold(1.1);
  await m.end();

  await pD.goto(iniUrl);
  await settle(pD);
  const d = await scene('13-ini-run', pD).start(900, 300);
  const req = pD.locator('li.request', { hasText: MARINA.name });
  await d.ensureVisible(req);
  await d.point(req, { dx: 0.3 });
  await d.hold(0.5);
  await d.click(req.getByRole('button', { name: 'Принять' }), { wait: () => req.waitFor({ state: 'detached', timeout: 15000 }) });
  await d.click(pD.locator('button[type="submit"]:has-text("Команда собрана, начинаем")'));
  await pD.locator('#r-res').waitFor();
  await settle(pD);
  await d.hold(0.5);
  d.mark('report');
  await d.type(pD.locator('#r-res'), 'Провели экскурсию для 22 первокурсников, сняли ролик со сменой и ответили на вопросы о практике.', { cps: 110 });
  await pD.fill('#r-play', '1. Согласовать время с руководителем АЗС\n2. Собрать вопросы студентов заранее\n3. Снимать только в разрешённой зоне\n4. Показать ролик на классном часе');
  await d.shot(0.3);
  await d.type(pD.locator('#r-aud'), '22', { cps: 30 });
  await d.type(pD.locator('#r-reach'), '1850', { cps: 40 });
  await d.type(pD.locator('#r-score'), '4,8', { cps: 30 });
  await d.click(pD.locator('button[type="submit"]:has-text("Отправить итоги куратору")'));
  await pD.getByText('Итоги у куратора').first().waitFor();
  await settle(pD);
  await d.hold(0.9);
  await d.end();
});

// 12. Итоги приняты: баллы команде и новый уровень Марины
await run('ini-done', async () => {
  await pC.goto(`${BASE}/curator/initiatives`);
  await settle(pC);
  const c = await scene('14-ini-done', pC).start(900, 300);
  const card = pC.locator('article.mod', { hasText: INI });
  await c.ensureVisible(card, { top: 90, bottom: 40 });
  await c.point(card, { dy: 0.4 });
  await c.hold(0.9);
  await c.click(card.getByRole('button', { name: 'Принять и начислить баллы' }), { wait: () => card.waitFor({ state: 'detached', timeout: 15000 }) });
  await c.hold(1.3);
  await c.end();

  await pA.goto(iniUrl);
  await settle(pA);
  const m = await scene('15-level-up', pA).start(900, 300);
  await m.hold(1.6);
  await pA.goto(`${BASE}/me`);
  await settle(pA);
  await m.setCursor(700, 300);
  await m.point(pA.locator('section.level .lvl-name'), { dx: 0.3 });
  await m.zoom(pA.locator('section.level'), 1.2, 0.6);
  await m.hold(1.8);
  await m.unzoom();
  await m.end();
});

// формат повторили в Томске
const [ini] = await sql`select id, format, summary, goal, roles, looking_for from initiatives where title = ${INI}`;
const [tomsk] = await sql`select id from users where region_id = 'tomsk' and role = 'ambassador' and status = 'active' order by points desc limit 1`;
if (ini && tomsk) {
  await sql`insert into initiatives (author_id, source_id, title, format, region_id, audience, summary, goal, looking_for, roles, team_size, on_site, status, approved_at, started_at)
            values (${tomsk.id}, ${ini.id}, ${INI + ' — Томск'}, ${ini.format}, 'tomsk', 'Первый курс колледжа', ${ini.summary}, ${ini.goal}, ${ini.looking_for}, ${ini.roles}, 4, true, 'active', now(), now())`;
}

// 13. Библиотека форматов
await run('library', async () => {
  await pA.goto(`${BASE}/me/formats`);
  await settle(pA);
  const s = await scene('16-library', pA).start(700, 300);
  await s.hold(0.8);
  const flow = pA.locator('.flow-card');
  if (await flow.count()) { await s.ensureVisible(flow, { top: 80, bottom: 20 }); await s.point(flow, { dx: 0.6, dy: 0.55 }); await s.hold(1.8); }
  const tile = pA.locator('a.itile', { hasText: INI }).first();
  await s.point(tile, { dy: 0.4 });
  await s.hold(1.6);
  await s.end();
});

// 14. Кабинет куратора
await run('curator', async () => {
  await pC.goto(`${BASE}/curator`);
  await settle(pC);
  const s = await scene('17-curator', pC).start(900, 260);
  await s.hold(1.4);
  await s.point(pC.locator('.attention a').first(), { sec: 0.5 });
  await s.hold(0.7);
  s.mark('community');
  await s.scrollToEl(pC.locator('section.community'), 24, 1.1);
  await s.move(900, 420, 0.5);
  await s.hold(2.0);
  s.mark('kpis');
  await s.scrollToEl(pC.locator('.kpis').first(), 24, 1.1);
  await s.hold(1.6);
  s.mark('funnel');
  await s.scrollToEl(pC.locator('section.card', { hasText: 'От публикации до найма' }), 24, 1.0);
  await s.hold(1.8);
  await s.end();
});

await browser.close();
await sql.end();
const total = manifest.reduce((a, m) => a + m.duration, 0);
log(`сцен: ${manifest.length}, длительность: ${total.toFixed(1)} с`);
