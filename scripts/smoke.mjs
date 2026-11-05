// Автотест всего пути программы на чистой базе.
// Участников заводит сам через заявки: одобрение куратором → капитан и наставник → сдача задания →
// проверка капитаном → баллы → обмен на награду → выдача. Плюс телефон и тёмная тема.
// Запуск: npm run build && npm start, затем npm run smoke. Нужны ADMIN_EMAIL и ADMIN_PASSWORD.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN = { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD };
if (!ADMIN.email || !ADMIN.password) {
  console.error('[smoke] задайте ADMIN_EMAIL и ADMIN_PASSWORD');
  process.exit(1);
}
const OUT = 'screenshots';
await mkdir(OUT, { recursive: true });

const problems = [];
const log = (...a) => console.log('[smoke]', ...a);
const browser = await chromium.launch();
const DESKTOP = { viewport: { width: 1366, height: 900 }, locale: 'ru-RU', timezoneId: 'Europe/Moscow' };
const MOBILE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ru-RU', timezoneId: 'Europe/Moscow' };

const stamp = Date.now();
const ANNA = { name: 'Анна Тестова', email: `anna${stamp}@example.com`, password: 'anna-pass-123', segment: 'АЗС и нефтебаза', region: 'omsk', org: 'АЗС № 501', position: 'Оператор АЗС' };
const BORIS = { name: 'Борис Капитанов', email: `boris${stamp}@example.com`, password: 'boris-pass-123', segment: 'АЗС и нефтебаза', region: 'omsk', org: 'АЗС № 214', position: 'Менеджер АЗС' };
const SEMYON = { name: 'Семён Студентов', email: `semyon${stamp}@example.com`, password: 'semyon-pass-123', segment: 'Студент колледжа', region: 'omsk', org: 'Нефтяной техникум', position: '2 курс' };

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
async function loginAs(p, who) {
  await p.goto(`${BASE}/login`);
  await p.fill('#email', who.email);
  await p.fill('#password', who.password);
  await Promise.all([p.waitForURL(/\/(me|curator|status)/), p.click('form button[type="submit"]:has-text("Войти")')]);
}
async function join(p, who) {
  await p.goto(`${BASE}/join`);
  await p.locator('label.seg-card', { hasText: who.segment }).click();
  await p.fill('#name', who.name);
  await p.selectOption('#region', who.region);
  await p.fill('#org', who.org);
  await p.fill('#position', who.position);
  await p.fill('#email', who.email);
  await p.fill('#password', who.password);
  await p.fill('#motivation', 'Хочу рассказывать о работе и помогать новичкам разобраться, как всё устроено.');
  await p.check('input[name="consent"]');
  await Promise.all([p.waitForURL(/\/status/), p.click('button[type="submit"]:has-text("Отправить заявку")')]);
  await p.getByText('Заявка на рассмотрении').waitFor();
}
async function openAmbassador(p, who) {
  await p.goto(`${BASE}/curator/ambassadors?q=${encodeURIComponent(who.email)}`);
  await p.locator('a.rowlink', { hasText: who.name }).click();
  await p.waitForURL(/\/curator\/ambassadors\/\d+/);
}

// 1. Публичная часть и заявки
await step('главная, вход без демо-доступа, заявки', async () => {
  const p = await page();
  await p.goto(BASE);
  await p.getByRole('heading', { name: /Голос/ }).first().waitFor();
  await shot(p, '01-landing');
  await p.goto(`${BASE}/login`);
  if (await p.getByText('Демо-доступ').count()) problems.push('на странице входа остался демо-доступ');
  await shot(p, '02-login');
  await join(p, ANNA);
  await shot(p, '03-status-pending');
  await p.context().clearCookies();
  await join(p, BORIS);
  await p.context().clearCookies();
  await join(p, SEMYON);
  await p.context().close();
});

// 2. Куратор: принимает заявки, назначает капитана, наставника, бонус; публикует задание; вносит метрики
await step('куратор настраивает программу', async () => {
  const p = await page();
  await loginAs(p, ADMIN);
  await p.waitForURL(/\/curator$/);
  await p.getByRole('heading', { name: 'Обзор программы' }).waitFor();
  await shot(p, '10-curator-overview-empty');
  await p.goto(`${BASE}/curator/applications`);
  await shot(p, '11-curator-applications');
  for (const who of [ANNA, BORIS, SEMYON]) {
    const card = p.locator('article.mod', { hasText: who.name });
    await card.getByRole('button', { name: 'Принять в программу' }).click();
    await card.waitFor({ state: 'detached', timeout: 15000 });
  }
  await openAmbassador(p, BORIS);
  await p.getByRole('button', { name: 'Назначить капитаном региона' }).click();
  await p.getByText('капитан региона', { exact: true }).waitFor();
  await openAmbassador(p, SEMYON);
  await p.selectOption('select[name="mentorId"]', { label: `${ANNA.name} — ${ANNA.segment}, Омск` });
  await p.getByRole('button', { name: 'Сохранить наставника' }).click();
  await p.waitForLoadState('networkidle');
  await openAmbassador(p, ANNA);
  await p.fill('input[name="amount"]', '200');
  await p.fill('input[name="reason"]', 'Помощь на дне открытых дверей');
  await p.getByRole('button', { name: 'Начислить' }).click();
  await p.getByText('Помощь на дне открытых дверей').waitFor();
  await shot(p, '12-curator-ambassador');
  await p.goto(`${BASE}/curator/tasks/new`);
  await p.fill('#title', 'Фото рабочего места к зиме');
  await p.fill('#why', 'Показать, как объекты готовятся к холодам.');
  await p.fill('#steps', 'Сфотографируйте рабочее место в разрешённой зоне\nДобавьте одну фразу о работе');
  await Promise.all([p.waitForURL(/\/curator\/tasks\?ok=1/), p.click('button[type="submit"]:has-text("Опубликовать задание")')]);
  await p.getByText('Фото рабочего места к зиме').waitFor();
  await shot(p, '13-curator-tasks');
  await p.goto(`${BASE}/curator/metrics`);
  await p.fill('#m-reach', '12000');
  await p.fill('#m-interactions', '540');
  await p.fill('#m-careerVisits', '80');
  await p.fill('#m-applications', '12');
  await Promise.all([p.waitForURL(/ok=/), p.click('button[type="submit"]:has-text("Сохранить")')]);
  await shot(p, '14-curator-metrics');
  await p.goto(`${BASE}/curator/account`);
  await p.getByText('Смена пароля').waitFor();
  await p.context().close();
});

// 3. Амбассадор сдаёт задание
let taskUrl = '';
await step('амбассадор сдаёт задание', async () => {
  const p = await page();
  await loginAs(p, ANNA);
  await p.waitForURL(/\/me$/);
  await shot(p, '20-anna-home');
  await p.goto(`${BASE}/me/tasks`);
  await p.getByText('Фото рабочего места к зиме').waitFor();
  await p.locator('a.task', { hasText: 'Наставник недели' }).first().click();
  await p.waitForURL(/\/me\/tasks\/\d+/);
  taskUrl = p.url();
  await p.fill('#body', 'Мой наставник Андрей научил спокойно работать в час пик и всегда помогал с вопросами.');
  await Promise.all([p.waitForURL(/sent=1/), p.click('button[type="submit"]:has-text("Отправить на проверку")')]);
  await p.getByText('Задание отправлено').waitFor();
  await shot(p, '21-task-sent');
  await p.context().close();
});

// 4. Капитан региона принимает
await step('капитан принимает задание', async () => {
  const p = await page();
  await loginAs(p, BORIS);
  await p.goto(`${BASE}/me/review`);
  const card = p.locator('article.mod', { hasText: ANNA.name });
  await card.waitFor();
  await shot(p, '30-captain-review');
  await card.getByRole('button', { name: 'Принять' }).click();
  await card.waitFor({ state: 'detached', timeout: 15000 });
  await p.context().close();
});

// 5. Баллы и награда
await step('баллы и обмен на награду', async () => {
  const p = await page();
  await loginAs(p, ANNA);
  await p.locator('.level-top b', { hasText: '260' }).waitFor();
  await p.goto(taskUrl);
  await p.getByText('Задание выполнено и принято').waitFor();
  await p.goto(`${BASE}/me/rewards`);
  await p.locator('.rw', { hasText: 'Стикеры и значок программы' }).locator('summary').click();
  await Promise.all([p.waitForURL(/ok=/), p.locator('.rw details[open] button[type="submit"]').click()]);
  await shot(p, '31-anna-rewards');
  for (const [path, name] of [['notifications', '32-notifications'], ['kit', '33-kit'], ['rating', '34-rating'], ['profile', '35-profile']]) {
    await p.goto(`${BASE}/me/${path}`);
    await shot(p, name);
  }
  await p.context().close();
});

await step('куратор выдаёт награду', async () => {
  const p = await page();
  await loginAs(p, ADMIN);
  await p.goto(`${BASE}/curator/rewards`);
  const card = p.locator('article.mod', { hasText: ANNA.name });
  await card.getByRole('button', { name: 'Выдано' }).click();
  await card.waitFor({ state: 'detached', timeout: 15000 });
  for (const [path, name] of [['', '40-curator-overview'], ['/moderation', '41-curator-moderation'], ['/ambassadors', '42-curator-ambassadors'], ['/regions', '43-curator-regions']]) {
    await p.goto(`${BASE}/curator${path}`);
    await shot(p, name);
  }
  await p.context().close();
});

// 6. Студент видит наставника
await step('студент и тандем', async () => {
  const p = await page();
  await loginAs(p, SEMYON);
  await p.getByText('Анна', { exact: false }).first().waitFor();
  await shot(p, '50-student-home');
  await p.context().close();
});

// 7. Инициатива снизу: идея студента → согласование → команда со смены → итоги → баллы → повтор
const INI = `Голос профессии: смена оператора ${stamp % 1000}`;
let iniUrl = '';
await step('студент предлагает инициативу', async () => {
  const p = await page();
  await loginAs(p, SEMYON);
  await p.goto(`${BASE}/me/initiatives`);
  await shot(p, '80-initiatives-empty');
  await p.goto(`${BASE}/me/initiatives/new`);
  await p.locator('button.tpl', { hasText: 'Голос профессии' }).click();
  await p.fill('#i-title', INI);
  await p.fill('#i-aud', 'Студенты 2 курса нефтяного техникума');
  await shot(p, '81-initiative-new');
  await Promise.all([p.waitForURL(/\/me\/initiatives\/\d+\?created=1/), p.click('button[type="submit"]:has-text("Отправить на согласование")')]);
  iniUrl = p.url().split('?')[0];
  await p.getByText('Идея у куратора').waitFor();
  await p.context().close();
});

await step('куратор согласует идею', async () => {
  const p = await page();
  await loginAs(p, ADMIN);
  await p.goto(`${BASE}/curator/initiatives`);
  const card = p.locator('article.mod', { hasText: INI });
  await card.waitFor();
  await shot(p, '82-curator-initiatives');
  await card.getByRole('button', { name: 'Согласовать' }).click();
  await card.waitFor({ state: 'detached', timeout: 15000 });
  await p.context().close();
});

await step('сотрудник АЗС откликается', async () => {
  const p = await page();
  await loginAs(p, ANNA);
  await p.goto(`${BASE}/me/initiatives`);
  await shot(p, '83-initiatives-board');
  await p.locator('a.itile', { hasText: INI }).click();
  await p.waitForURL(/\/me\/initiatives\/\d+$/);
  await p.fill('#j-note', 'Работаю оператором пять лет, могу рассказать про смену и показать АЗС.');
  await p.click('button[type="submit"]:has-text("Хочу в команду")');
  await p.getByText('Отклик отправлен').waitFor();
  await p.context().close();
});

await step('автор собирает команду и сдаёт итоги', async () => {
  const p = await page();
  await loginAs(p, SEMYON);
  await p.goto(iniUrl);
  const req = p.locator('li.request', { hasText: ANNA.name });
  await req.getByRole('button', { name: 'Принять' }).click();
  await req.waitFor({ state: 'detached', timeout: 15000 });
  await p.click('button[type="submit"]:has-text("Команда собрана, начинаем")');
  await p.locator('#r-res').waitFor();
  await p.fill('#r-res', 'Сняли три ролика по 60 секунд со сменой АЗС, показали на классном часе в техникуме. Пришли 34 студента, задали больше 20 вопросов.');
  await p.fill('#r-play', '1. Договориться с руководителем АЗС о времени съёмки\n2. Собрать вопросы у студентов заранее\n3. Снимать в разрешённой зоне, 3 сюжета по минуте\n4. Показать ролики на классном часе');
  await p.fill('#r-aud', '34');
  await p.fill('#r-reach', '2140');
  await p.fill('#r-score', '4,7');
  await p.click('button[type="submit"]:has-text("Отправить итоги куратору")');
  await p.getByText('Итоги у куратора').waitFor();
  await p.context().close();
});

await step('куратор принимает итоги, команда получает баллы', async () => {
  const p = await page();
  await loginAs(p, ADMIN);
  await p.goto(`${BASE}/curator/initiatives`);
  const card = p.locator('article.mod', { hasText: INI });
  await card.getByRole('button', { name: 'Принять и начислить баллы' }).click();
  await card.waitFor({ state: 'detached', timeout: 15000 });
  await p.goto(`${BASE}/curator`);
  await shot(p, '84-curator-community');
  await p.goto(iniUrl.replace('/me/', '/curator/'));
  await shot(p, '85-curator-initiative');
  await p.context().close();

  const s = await page();
  await loginAs(s, SEMYON);
  await s.goto(iniUrl);
  await s.getByText('Проект завершён').waitFor();
  await shot(s, '86-initiative-done');
  await s.goto(`${BASE}/me/rewards`);
  await s.getByRole('heading', { name: 'Карьерная поддержка' }).waitFor();
  if (await s.getByText(/приоритет/i).count()) throw new Error('в наградах студента осталось обещание приоритета на практику');
  await shot(s, '87-student-status');
  await s.context().close();
});

await step('формат повторяют из библиотеки', async () => {
  const p = await page();
  await loginAs(p, BORIS);
  await p.goto(`${BASE}/me/formats`);
  await shot(p, '88-formats');
  await p.locator('a.itile', { hasText: INI }).click();
  await p.getByRole('link', { name: 'Повторить в моём регионе' }).click();
  await p.waitForURL(/\/me\/initiatives\/new\?from=\d+/);
  await Promise.all([p.waitForURL(/\/me\/initiatives\/\d+\?created=1/), p.click('button[type="submit"]:has-text("Отправить на согласование")')]);
  await p.getByText(/формат из города/).waitFor();
  await p.context().close();
});

// 7б. Вопрос куратору, временный пароль и ответ в кабинет
await step('вопрос куратору и сброс пароля', async () => {
  const p = await page();
  await p.goto(`${BASE}/help?topic=access`);
  await p.fill('#q-name', ANNA.name);
  await p.fill('#q-email', ANNA.email);
  await p.fill('#q-body', 'Не помню пароль от кабинета, помогите войти.');
  await p.click('button[type="submit"]:has-text("Отправить куратору")');
  await p.getByText('Вопрос отправлен').waitFor();
  await shot(p, '80-help');
  await p.context().close();

  const c = await page();
  await loginAs(c, ADMIN);
  await c.goto(`${BASE}/curator/questions`);
  const q = c.locator('article.mod', { hasText: ANNA.email });
  await q.waitFor();
  await shot(c, '81-curator-questions');
  await q.getByRole('link', { name: 'Карточка участника' }).click();
  await c.waitForURL(/\/curator\/ambassadors\/\d+/);
  await c.getByRole('button', { name: 'Сбросить пароль' }).click();
  await c.getByRole('button', { name: 'Да, выдать временный пароль' }).click();
  const temp = (await c.locator('.temp-pw code').textContent({ timeout: 15000 }))?.trim();
  if (!temp || temp.length < 8) throw new Error('временный пароль не показан');
  await shot(c, '82-reset-password');
  await c.goto(`${BASE}/curator/questions`);
  if (await c.locator('article.mod', { hasText: ANNA.email }).count()) throw new Error('вопрос о доступе не закрылся после сброса пароля');
  await c.context().close();

  const a = await page();
  await loginAs(a, { email: ANNA.email, password: temp });
  await a.waitForURL(/\/me\/profile/);
  await a.getByText('Вы вошли по временному паролю').first().waitFor();
  await a.fill('#pw-cur', temp);
  await a.fill('#pw-new', ANNA.password);
  await a.click('button[type="submit"]:has-text("Сменить пароль")');
  await a.getByText('Пароль изменён.').waitFor();
  await a.goto(`${BASE}/help?topic=program`);
  await a.fill('#q-body', 'Когда начисляют баллы за проект?');
  await a.click('button[type="submit"]:has-text("Отправить куратору")');
  await a.getByText('Вопрос отправлен').waitFor();
  await a.context().close();

  const c2 = await page();
  await loginAs(c2, ADMIN);
  await c2.goto(`${BASE}/curator/questions`);
  const q2 = c2.locator('article.mod', { hasText: 'Когда начисляют баллы' });
  await q2.locator('textarea[name="reply"]').fill('После того как куратор примет итоги проекта.');
  await q2.getByRole('button', { name: 'Ответить и закрыть' }).click();
  await q2.waitFor({ state: 'detached', timeout: 15000 });
  await c2.context().close();

  const a2 = await page();
  await loginAs(a2, ANNA);
  await a2.goto(`${BASE}/help`);
  await a2.getByText('После того как куратор примет итоги проекта.').waitFor();
  await a2.goto(`${BASE}/me/kit`);
  const link = await a2.locator('.link-row input').inputValue();
  if (!/utm_source=ambassador/.test(link) || !/utm_content=a\d+/.test(link)) throw new Error(`личная ссылка без UTM-метки: ${link}`);
  await a2.context().close();
});

// 8. Телефон и тёмная тема
await step('мобильная версия', async () => {
  const p = await page(MOBILE);
  for (const [path, name] of [['/', '60-m-landing'], ['/login', '60-m-login'], ['/join', '60-m-join'], ['/help', '60-m-help']]) {
    await p.goto(`${BASE}${path}`);
    await noOverflow(p, 'телефон');
    await shot(p, name);
  }
  await loginAs(p, ANNA);
  for (const [path, name] of [['', '61-m-home'], ['/tasks', '62-m-tasks'], ['/kit', '63-m-kit'], ['/rewards', '64-m-rewards'], ['/rating', '65-m-rating'], ['/profile', '66-m-profile'], ['/notifications', '67-m-notifications'], ['/initiatives', '69-m-initiatives'], ['/formats', '69-m-formats'], ['/initiatives/new', '69-m-initiative-new']]) {
    await p.goto(`${BASE}/me${path}`);
    await noOverflow(p, 'телефон');
    await shot(p, name);
  }
  await p.goto(taskUrl);
  await noOverflow(p, 'телефон');
  if (iniUrl) {
    await p.goto(iniUrl);
    await noOverflow(p, 'телефон, инициатива');
    await shot(p, '69-m-initiative');
  }
  await p.context().close();
  const c = await page(MOBILE);
  await loginAs(c, ADMIN);
  await shot(c, '68-m-curator');
  for (const path of ['', '/moderation', '/applications', '/questions', '/ambassadors', '/tasks', '/tasks/new', '/rewards', '/regions', '/metrics', '/account', '/initiatives']) {
    await c.goto(`${BASE}/curator${path}`);
    await noOverflow(c, 'телефон, куратор');
  }
  await c.context().close();
  const cap = await page(MOBILE);
  await loginAs(cap, BORIS);
  await cap.goto(`${BASE}/me/review`);
  await noOverflow(cap, 'телефон, капитан');
  await cap.context().close();
});

await step('тёмная тема', async () => {
  const p = await page({ ...DESKTOP, colorScheme: 'dark' });
  await loginAs(p, ANNA);
  await shot(p, '70-dark-home');
  await p.context().close();
  const c = await page({ ...DESKTOP, colorScheme: 'dark' });
  await loginAs(c, ADMIN);
  await c.goto(`${BASE}/curator/regions`);
  await shot(c, '71-dark-regions');
  await c.context().close();
});

await browser.close();
await writeFile(`${OUT}/problems.txt`, problems.join('\n') || 'нет проблем');
if (problems.length) {
  console.error('\n[smoke] Найдены проблемы:\n' + problems.map((x) => ' - ' + x).join('\n'));
  process.exit(1);
}
console.log('\n[smoke] Все сценарии прошли');
