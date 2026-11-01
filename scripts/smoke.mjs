// Автотест основных сценариев: заявка → одобрение куратором → сдача задания → проверка капитаном → баллы → награда.
// Запуск: npm run build && npm start, затем npm run smoke (нужен playwright с chromium).
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT = 'screenshots';
await mkdir(OUT, { recursive: true });

const problems = [];
const log = (...a) => console.log('[smoke]', ...a);
const browser = await chromium.launch();
const DESKTOP = { viewport: { width: 1366, height: 900 }, locale: 'ru-RU', timezoneId: 'Europe/Moscow' };
const MOBILE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ru-RU', timezoneId: 'Europe/Moscow' };

async function page(opts = DESKTOP) {
  const ctx = await browser.newContext(opts);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => problems.push(`pageerror ${p.url()}: ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) problems.push(`console ${p.url()}: ${m.text()}`); });
  p.on('response', (r) => { if (r.status() >= 500) problems.push(`HTTP ${r.status()} ${r.url()}`); });
  return p;
}
async function shot(p, name) {
  await p.waitForLoadState('networkidle').catch(() => {});
  await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  log('скриншот', name);
}
async function noOverflow(p, label) {
  const extra = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (extra > 1) problems.push(`${label}: страница шире экрана на ${extra}px (${p.url()})`);
}
async function step(name, fn) {
  try { await fn(); log('ok:', name); }
  catch (e) { problems.push(`шаг «${name}»: ${e.message.split('\n')[0]}`); log('FAIL:', name, e.message); }
}
async function demo(p, who) {
  await p.goto(`${BASE}/login`);
  await Promise.all([p.waitForURL(/\/(me|curator)/), p.click(`form.demo-grid button[value="${who}"]`)]);
}
async function loginAs(p, email, password) {
  await p.goto(`${BASE}/login`);
  await p.fill('#email', email);
  await p.fill('#password', password);
  await Promise.all([p.waitForURL(/\/(me|curator|status)/), p.click('form button[type="submit"]:has-text("Войти")')]);
}

const email = `smoke${Date.now()}@example.com`;
const password = 'smoke-pass-123';
const NAME = 'Тест Смоуков';

// 1. Публичная часть
await step('главная, вход и заявка', async () => {
  const p = await page();
  await p.goto(BASE);
  await p.getByRole('heading', { name: /Голос/ }).first().waitFor();
  await shot(p, '01-landing');
  await p.goto(`${BASE}/login`);
  await shot(p, '02-login');
  await p.goto(`${BASE}/join`);
  await p.locator('label.seg-card', { hasText: 'АЗС и нефтебаза' }).click();
  await p.fill('#name', NAME);
  await p.selectOption('#region', 'omsk');
  await p.fill('#org', 'АЗС № 501');
  await p.fill('#position', 'Оператор АЗС');
  await p.fill('#email', email);
  await p.fill('#password', password);
  await p.fill('#motivation', 'Хочу рассказывать о работе на АЗС и помогать студентам колледжа с практикой.');
  await p.check('input[name="consent"]');
  await shot(p, '03-join-filled');
  await Promise.all([p.waitForURL(/\/status/), p.click('button[type="submit"]:has-text("Отправить заявку")')]);
  await p.getByText('Заявка на рассмотрении').waitFor();
  await shot(p, '04-status-pending');
  await p.context().close();
});

// 1б. Вход куратора по почте и паролю (аккаунт из ADMIN_EMAIL / ADMIN_PASSWORD)
if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
  await step('вход куратора по паролю', async () => {
    const p = await page();
    await loginAs(p, process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
    await p.waitForURL(/\/curator$/);
    await p.getByRole('heading', { name: 'Обзор программы' }).waitFor();
    await p.goto(`${BASE}/curator/account`);
    await p.getByText('Смена пароля').waitFor();
    await p.context().close();
  });
}

// 2. Куратор: одобряет заявку, публикует задание, смотрит разделы
await step('куратор', async () => {
  const p = await page();
  await demo(p, 'curator');
  await p.getByRole('heading', { name: 'Обзор программы' }).waitFor();
  await shot(p, '10-curator-overview');
  await p.goto(`${BASE}/curator/applications`);
  const card = p.locator('article.mod', { hasText: NAME });
  await card.getByRole('button', { name: 'Принять в программу' }).click();
  await card.waitFor({ state: 'detached', timeout: 15000 });
  await shot(p, '11-curator-applications');
  await p.goto(`${BASE}/curator/moderation?f=all`);
  await shot(p, '12-curator-moderation');
  await p.goto(`${BASE}/curator/ambassadors`);
  await shot(p, '13-curator-ambassadors');
  await p.locator('a.rowlink').first().click();
  await p.waitForURL(/\/curator\/ambassadors\/\d+/);
  await shot(p, '14-curator-ambassador');
  await p.goto(`${BASE}/curator/tasks/new`);
  await p.fill('#title', 'Смоук: фото рабочего места');
  await p.fill('#why', 'Проверка публикации задания.');
  await p.fill('#steps', 'Шаг один\nШаг два');
  await shot(p, '15-curator-task-new');
  await Promise.all([p.waitForURL(/\/curator\/tasks\?ok=1/), p.click('button[type="submit"]:has-text("Опубликовать задание")')]);
  await p.getByText('Смоук: фото рабочего места').waitFor();
  await shot(p, '16-curator-tasks');
  for (const [path, name] of [['rewards', '17-curator-rewards'], ['regions', '18-curator-regions'], ['metrics', '19-curator-metrics']]) {
    await p.goto(`${BASE}/curator/${path}`);
    await shot(p, name);
  }
  await p.context().close();
});

// 3. Новый амбассадор сдаёт задание
let taskUrl = '';
await step('амбассадор сдаёт задание', async () => {
  const p = await page();
  await loginAs(p, email, password);
  await p.waitForURL(/\/me$/);
  await shot(p, '20-new-ambassador-home');
  await p.goto(`${BASE}/me/tasks`);
  await p.getByText('Смоук: фото рабочего места').waitFor();
  await shot(p, '21-new-ambassador-tasks');
  await p.locator('a.task', { hasText: 'Наставник недели' }).first().click();
  await p.waitForURL(/\/me\/tasks\/\d+/);
  taskUrl = p.url();
  await p.fill('#body', 'Мой наставник Андрей научил спокойно работать в час пик и всегда помогал с вопросами.');
  await Promise.all([p.waitForURL(/sent=1/), p.click('button[type="submit"]:has-text("Отправить на проверку")')]);
  await p.getByText('Задание отправлено').waitFor();
  await shot(p, '22-task-sent');
  await p.context().close();
});

// 4. Капитан региона проверяет
await step('капитан принимает задание', async () => {
  const p = await page();
  await demo(p, 'captain');
  await p.goto(`${BASE}/me/review`);
  const card = p.locator('article.mod', { hasText: NAME });
  await card.waitFor();
  await shot(p, '30-captain-review');
  await card.getByRole('button', { name: 'Принять' }).click();
  await card.waitFor({ state: 'detached', timeout: 15000 });
  await p.context().close();
});

// 5. Баллы начислены
await step('баллы у амбассадора', async () => {
  const p = await page();
  await loginAs(p, email, password);
  await p.locator('.level-top b', { hasText: '60' }).waitFor();
  await p.goto(taskUrl);
  await p.getByText('Задание выполнено и принято').waitFor();
  await p.goto(`${BASE}/me/notifications`);
  await p.getByText('принято: +60 баллов').first().waitFor();
  await shot(p, '31-notifications');
  await p.context().close();
});

// 6. Демо-амбассадор: награды и остальные разделы
await step('демо-амбассадор', async () => {
  const p = await page();
  await demo(p, 'ambassador');
  await shot(p, '40-alina-home');
  await p.goto(`${BASE}/me/rewards`);
  const first = p.locator('.rw summary', { hasText: 'Обменять' }).first();
  await first.click();
  await Promise.all([p.waitForURL(/ok=/), p.locator('.rw details[open] button[type="submit"]').click()]);
  await shot(p, '41-alina-rewards');
  for (const [path, name] of [['tasks', '42-alina-tasks'], ['kit', '43-alina-kit'], ['rating', '44-alina-rating'], ['profile', '45-alina-profile']]) {
    await p.goto(`${BASE}/me/${path}`);
    await shot(p, name);
  }
  await p.locator('a.task', { hasText: 'Голосовая история' }).first().waitFor({ timeout: 2000 }).catch(() => {});
  await p.context().close();
});

// 7. Телефон и тёмная тема
await step('мобильная версия', async () => {
  const p = await page(MOBILE);
  for (const [path, name] of [['/', '50-m-landing'], ['/login', '50-m-login'], ['/join', '50-m-join']]) {
    await p.goto(`${BASE}${path}`);
    await noOverflow(p, 'телефон');
    await shot(p, name);
  }
  await demo(p, 'student');
  await shot(p, '51-m-student-home');
  await noOverflow(p, 'телефон');
  for (const [path, name] of [['tasks', '52-m-tasks'], ['kit', '53-m-kit'], ['rewards', '54-m-rewards'], ['rating', '54-m-rating'], ['profile', '54-m-profile'], ['notifications', '54-m-notifications']]) {
    await p.goto(`${BASE}/me/${path}`);
    await noOverflow(p, 'телефон');
    await shot(p, name);
  }
  await p.locator('a.task').first().click().catch(() => {});
  await p.waitForURL(/\/me\/tasks\/\d+/).catch(() => {});
  await noOverflow(p, 'телефон');
  await shot(p, '54-m-task');
  await p.context().close();
  const c = await page(MOBILE);
  await demo(c, 'curator');
  await shot(c, '55-m-curator');
  for (const path of ['', '/moderation', '/applications', '/ambassadors', '/tasks', '/tasks/new', '/rewards', '/regions', '/metrics']) {
    await c.goto(`${BASE}/curator${path}`);
    await noOverflow(c, 'телефон, куратор');
  }
  await c.context().close();
  const cap = await page(MOBILE);
  await demo(cap, 'captain');
  await cap.goto(`${BASE}/me/review`);
  await noOverflow(cap, 'телефон, капитан');
  await shot(cap, '56-m-captain-review');
  await cap.context().close();
});

await step('тёмная тема', async () => {
  const p = await page({ ...DESKTOP, colorScheme: 'dark' });
  await demo(p, 'captain');
  await shot(p, '60-dark-captain-home');
  await p.context().close();
  const c = await page({ ...DESKTOP, colorScheme: 'dark' });
  await demo(c, 'curator');
  await c.goto(`${BASE}/curator/regions`);
  await shot(c, '61-dark-regions');
  await c.context().close();
});

await browser.close();
await writeFile(`${OUT}/problems.txt`, problems.join('\n') || 'нет проблем');
if (problems.length) {
  console.error('\n[smoke] Найдены проблемы:\n' + problems.map((x) => ' - ' + x).join('\n'));
  process.exit(1);
}
console.log('\n[smoke] Все сценарии прошли');
