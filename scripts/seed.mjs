// Начальные данные: справочники (всегда) и демо-данные (если DEMO_MODE не равен "false").
import { hash } from 'bcryptjs';

export const REGIONS = [
  { id: 'spb', name: 'Санкт-Петербург и Ленинградская область', city: 'Санкт-Петербург', lon: 30.3, lat: 59.94, tz: 0 },
  { id: 'msk', name: 'Москва и Московская область', city: 'Москва', lon: 37.62, lat: 55.75, tz: 0 },
  { id: 'yar', name: 'Ярославская область', city: 'Ярославль', lon: 39.89, lat: 57.63, tz: 0 },
  { id: 'nnov', name: 'Нижегородская область', city: 'Нижний Новгород', lon: 44.0, lat: 56.33, tz: 0 },
  { id: 'ekb', name: 'Свердловская область', city: 'Екатеринбург', lon: 60.6, lat: 56.84, tz: 2 },
  { id: 'chel', name: 'Челябинская область', city: 'Челябинск', lon: 61.4, lat: 55.16, tz: 2 },
  { id: 'tmn', name: 'Тюменская область', city: 'Тюмень', lon: 65.53, lat: 57.15, tz: 2 },
  { id: 'omsk', name: 'Омская область', city: 'Омск', lon: 73.37, lat: 54.99, tz: 3 },
  { id: 'nsk', name: 'Новосибирская область', city: 'Новосибирск', lon: 82.92, lat: 55.03, tz: 4 },
  { id: 'tomsk', name: 'Томская область', city: 'Томск', lon: 84.95, lat: 56.48, tz: 4 },
  { id: 'krsk', name: 'Красноярский край', city: 'Красноярск', lon: 92.87, lat: 56.01, tz: 4 },
];

const T = (segment, title, kind, duration, points, channel, why, steps, submit_types, extra = {}) =>
  ({ segments: [segment], title, kind, duration, points, channel, why, steps, submit_types, joint: false, needs_curator: false, ...extra });

export const BASE_TASKS = [
  T('office', 'История одного решения', 'post', '30 мин', 100, 'Корпоративный канал в Telegram или VK',
    'Конкретная история о работе убеждает сильнее общих слов о «дружной команде».',
    ['Вспомните задачу, которую команда решила за последний месяц.', 'Соберите текст в конструкторе поста: кто вы, что случилось, что это говорит о работе.', 'Приложите фото команды с согласия коллег и отправьте на проверку.'],
    ['text', 'file']),
  T('office', 'Рекомендация в команду', 'link', '10 мин', 60, 'Личные соцсети и карьерные площадки',
    'Рекомендация знакомого — самый короткий путь к сильному кандидату.',
    ['Выберите вакансию из реферальной программы.', 'Добавьте личный комментарий: почему вы позвали бы сюда друга.', 'Опубликуйте и пришлите ссылку.'],
    ['link']),
  T('office', 'Эксперт на час', 'event', '1 час', 150, 'Внутренний канал амбассадоров',
    'Студентам важен живой разговор с человеком, который уже работает в компании.',
    ['Договоритесь с тандемом о дате встречи.', 'Проведите 20–30 минут онлайн: путь в компанию, первый год, ответы на вопросы.', 'Пришлите короткий отчёт: сколько было студентов и о чём спрашивали.'],
    ['text', 'file'], { joint: true }),
  T('office', 'Отзыв на карьерной площадке', 'post', '15 мин', 70, 'Карьерные площадки',
    'Кандидаты читают отзывы сотрудников до того, как откликнуться.',
    ['Откройте страницу компании на карьерной площадке.', 'Напишите честно: что нравится, чему научились, что было сложно.', 'Пришлите ссылку на отзыв.'],
    ['link'], { needs_curator: true }),

  T('site', 'Кадр смены', 'photo', '5 мин', 40, 'Корпоративный канал в MAX',
    'Работу на объектах мало кто видел изнутри. Один кадр делает её понятнее.',
    ['Сфотографируйте рабочее место в разрешённой зоне. Правила — в разделе «Памятка» контент-кита.', 'Добавьте одну фразу: за что вы цените свою работу.', 'Отправьте. Подпись поправит капитан или редактор.'],
    ['file', 'text'], { needs_curator: true }),
  T('site', 'Голосовая история', 'voice', '5 мин', 60, 'Каналы компании, текст соберёт редактор',
    'Писать текст не нужно: расскажите голосом, а капитан или редактор оформит пост.',
    ['Запишите в перерыве голосовое до 60 секунд: случай со смены, который запомнился.', 'Отправьте запись.', 'Согласуйте готовый текст перед публикацией.'],
    ['file', 'text']),
  T('site', 'Наставник недели', 'post', '10 мин', 60, 'Корпоративный канал в VK',
    'Истории о наставниках показывают, что новичка здесь не оставят одного.',
    ['Вспомните коллегу, который помог вам в первые месяцы.', 'Расскажите, чему он научил, в трёх–пяти предложениях.', 'Спросите согласие коллеги и отметьте его в публикации.'],
    ['text']),
  T('site', 'Принять гостей', 'event', '1,5 часа', 150, 'Площадки колледжа и внутренний канал',
    'Экскурсия на настоящую АЗС — самый сильный аргумент для студента колледжа.',
    ['Согласуйте с руководителем объекта время и маршрут.', 'Встретьте группу тандема и проведите инструктаж по безопасности.', 'Покажите работу смены. Студенты снимают ролик по сценарию из контент-кита.'],
    ['text', 'file'], { joint: true, needs_curator: true }),

  T('uni', 'Карьерный завтрак', 'event', '3 часа', 150, 'Площадки вуза и внутренний канал амбассадоров',
    'Встреча в формате «сотрудник, чай и вопросы» снимает дистанцию с большой компанией.',
    ['Забронируйте аудиторию и согласуйте дату с наставником.', 'Соберите 15–30 студентов через паблик вуза.', 'Пришлите фото и короткий отчёт: сколько пришло и о чём спрашивали.'],
    ['text', 'file'], { joint: true }),
  T('uni', 'Ролик «День в офисе»', 'video', '1 час', 100, 'Личные соцсети и внутренний канал',
    'Студенты верят сверстникам. Видео глазами студента работает лучше рекламы.',
    ['Откройте сценарий «Экскурсия глазами студента» в контент-ките.', 'Снимите 30 секунд во время экскурсии в офис.', 'Пришлите видео или ссылку на публикацию.'],
    ['file', 'link']),
  T('uni', 'Пост о практике', 'post', '20 мин', 60, 'Паблик вуза и карьерный центр',
    'Многие узнают о практике слишком поздно. Ваш пост напомнит вовремя.',
    ['Возьмите формулировки из раздела «Сообщения» контент-кита.', 'Напишите пост: кому подходит практика, как подать заявку, когда дедлайн.', 'Согласуйте с карьерным центром вуза и пришлите ссылку.'],
    ['link', 'text']),
  T('uni', 'Ярмарка вакансий', 'event', '4 часа', 120, 'Площадки вуза',
    'К стенду, где стоит студент-амбассадор, подходят охотнее.',
    ['Запишитесь на дежурство у куратора.', 'Рассказывайте о практике и программе амбассадоров, собирайте контакты.', 'Пришлите фото стенда и число контактов.'],
    ['text', 'file']),

  T('college', 'Экскурсия на АЗС', 'event', '2 часа', 120, 'Группа колледжа в соцсетях',
    'Увидеть работу оператора вживую — главный шаг к выбору практики.',
    ['Соберите группу из 8–12 человек и списки для пропуска.', 'Для участников младше 18 лет возьмите согласие родителей на съёмку.', 'Пройдите экскурсию с наставником и пришлите фото.'],
    ['file', 'text'], { joint: true, needs_curator: true }),
  T('college', 'Три вопроса оператору', 'video', '30 мин', 80, 'Соцсети колледжа',
    'Короткое интервью отвечает на то, что студенты стесняются спросить.',
    ['Подготовьте 3 вопроса: как попал в профессию, как проходит смена, куда расти.', 'Запишите ответы на телефон в разрешённой зоне.', 'Пришлите видео до 60 секунд.'],
    ['file', 'link'], { joint: true, needs_curator: true }),
  T('college', 'Стенд о практике', 'photo', '20 мин', 50, 'Колледж',
    'Стенд в коридоре видят все, даже те, кто не читает соцсети.',
    ['Возьмите текст из раздела «Сообщения» контент-кита.', 'Разместите объявление с разрешения администрации и добавьте QR-код на заявку.', 'Пришлите фото.'],
    ['file', 'text']),
  T('college', 'Пригласи однокурсника', 'link', '15 мин', 40, 'Личные сообщения',
    'Друг, который пришёл с вами на день открытых дверей, — будущий коллега.',
    ['Перешлите приглашение на день открытых дверей.', 'Напишите, кто из однокурсников записался.'],
    ['text']),
];

export const REWARDS = [
  { title: 'Завтрак с директором дирекции', category: 'Признание', cost: 800, min_level: 3, audience: 'all' },
  { title: 'Поездка на форум амбассадоров в Санкт-Петербург', category: 'Признание', cost: 1200, min_level: 4, audience: 'all' },
  { title: 'День открытых дверей на объекте для вашей семьи', category: 'Признание', cost: 450, min_level: 2, audience: 'internal' },
  { title: 'Курс «Сторителлинг и выступления»', category: 'Развитие', cost: 350, min_level: 1, audience: 'all' },
  { title: 'Фотосессия для личного бренда', category: 'Развитие', cost: 500, min_level: 2, audience: 'all' },
  { title: 'Приоритет при отборе на практику', category: 'Карьера', cost: 600, min_level: 2, audience: 'external' },
  { title: 'Рекомендательное письмо от компании', category: 'Карьера', cost: 300, min_level: 2, audience: 'external' },
  { title: 'Запись о вкладе в программу в карьерном профиле', category: 'Карьера', cost: 300, min_level: 2, audience: 'internal' },
  { title: 'Стикеры и значок программы', category: 'Мерч', cost: 150, min_level: 1, audience: 'all' },
  { title: 'Худи «Голос компании»', category: 'Мерч', cost: 400, min_level: 1, audience: 'all' },
  { title: '1000 бонусов программы лояльности АЗС', category: 'Бонусы', cost: 250, min_level: 1, audience: 'all', note: 'нужно согласование' },
];

// Прошедшие задания сезона — только для демо-данных (в архиве, неактивны).
const ARCHIVE = {
  office: [['Пост ко Дню знаний', 'post', 60], ['Мой первый год в компании', 'post', 100], ['Фото команды на субботнике', 'photo', 50], ['Отзыв о наставнике', 'post', 70], ['Пост о реферальной программе', 'link', 60], ['Выступление на дне карьеры', 'event', 150]],
  site: [['Утро на АЗС: фото', 'photo', 40], ['Голосовое: самый необычный клиент', 'voice', 60], ['Фото с коллегами смены', 'photo', 40], ['Как мы готовимся к зиме', 'post', 70], ['Видео: 15 секунд смены', 'video', 80], ['Наставник месяца', 'post', 60]],
  uni: [['Пост к началу учебного года', 'post', 60], ['Стенд на дне первокурсника', 'event', 120], ['Сторис с экскурсии', 'video', 80], ['Опрос однокурсников о карьере', 'link', 60], ['Лекция сотрудника в вузе', 'event', 150], ['Пост о стажировке', 'post', 60]],
  college: [['Пост о профессии оператора', 'post', 50], ['Фото с экскурсии', 'photo', 40], ['Классный час о практике', 'event', 120], ['Видео-вопрос мастеру', 'video', 80], ['Стенд в холле колледжа', 'photo', 50], ['Приглашение на день открытых дверей', 'link', 40]],
};

async function count(sql, table, where = sql``) {
  const [{ n }] = await sql`select count(*)::int as n from ${sql(table)} ${where}`;
  return n;
}

async function insertTask(sql, t, sort, active, createdAt = new Date()) {
  const [row] = await sql`
    insert into tasks (title, kind, duration, points, segments, channel, why, steps, submit_types, joint, needs_curator, active, sort, created_at)
    values (${t.title}, ${t.kind}, ${t.duration}, ${t.points}, ${sql.array(t.segments)}, ${t.channel}, ${t.why},
            ${sql.array(t.steps)}, ${sql.array(t.submit_types)}, ${t.joint}, ${t.needs_curator}, ${active}, ${sort}, ${createdAt})
    returning id`;
  return row.id;
}

export async function seedBase(sql) {
  if (!(await count(sql, 'regions'))) {
    for (const [i, r] of REGIONS.entries()) {
      await sql`insert into regions (id, name, city, lon, lat, tz, sort) values (${r.id}, ${r.name}, ${r.city}, ${r.lon}, ${r.lat}, ${r.tz}, ${i})`;
    }
    console.log('[seed] регионы');
  }
  if (!(await count(sql, 'tasks'))) {
    for (const [i, t] of BASE_TASKS.entries()) await insertTask(sql, t, i, true);
    console.log('[seed] задания');
  }
  if (!(await count(sql, 'rewards'))) {
    for (const [i, r] of REWARDS.entries()) {
      await sql`insert into rewards (title, category, cost, min_level, audience, note, sort) values (${r.title}, ${r.category}, ${r.cost}, ${r.min_level}, ${r.audience}, ${r.note ?? null}, ${i})`;
    }
    console.log('[seed] награды');
  }
}

export async function seedAdmin(sql) {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!email || !password) return;
  const exists = await sql`select id from users where email = ${email}`;
  if (exists.length) return;
  if (password.length < 8) { console.warn('[seed] ADMIN_PASSWORD короче 8 символов — куратор не создан'); return; }
  await sql`insert into users (email, password_hash, name, role, curator_scope, status, approved_at)
            values (${email}, ${await hash(password, 10)}, ${process.env.ADMIN_NAME || 'Куратор программы'}, 'curator', 'all', 'active', now())`;
  console.log('[seed] создан куратор', email);
}

/* ---------------- демо-данные ---------------- */

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MALE = ['Алексей', 'Артём', 'Дмитрий', 'Иван', 'Кирилл', 'Максим', 'Никита', 'Павел', 'Роман', 'Сергей', 'Тимур', 'Егор', 'Глеб', 'Илья', 'Степан', 'Андрей', 'Виктор', 'Олег', 'Фёдор', 'Михаил'];
const FEMALE = ['Анна', 'Алина', 'Вероника', 'Дарья', 'Евгения', 'Ирина', 'Ксения', 'Мария', 'Наталья', 'Ольга', 'Полина', 'София', 'Татьяна', 'Юлия', 'Яна', 'Вера', 'Елена', 'Алиса', 'Ева', 'Екатерина'];
const SURN = ['Иванов', 'Смирнов', 'Кузнецов', 'Попов', 'Соколов', 'Лебедев', 'Козлов', 'Новиков', 'Морозов', 'Волков', 'Соловьёв', 'Васильев', 'Зайцев', 'Павлов', 'Семёнов', 'Голубев', 'Виноградов', 'Богданов', 'Воробьёв', 'Фёдоров', 'Михайлов', 'Беляев', 'Тарасов', 'Белов', 'Комаров', 'Орлов', 'Киселёв', 'Макаров', 'Андреев', 'Ковалёв', 'Ильин', 'Гусев', 'Титов', 'Кузьмин', 'Кудрявцев', 'Баранов', 'Куликов', 'Алексеев', 'Степанов', 'Яковлев'];

const COUNTS = { spb: [8, 10], msk: [5, 7], yar: [4, 4], nnov: [3, 4], ekb: [5, 6], chel: [3, 4], tmn: [5, 4], omsk: [6, 7], nsk: [4, 6], tomsk: [2, 2], krsk: [3, 2] };
const ACTIVITY = { spb: 0.8, msk: 0.72, yar: 0.68, nnov: 0.57, ekb: 0.75, chel: 0.45, tmn: 0.82, omsk: 0.85, nsk: 0.7, tomsk: 0.45, krsk: 0.6 };

export async function seedDemo(sql) {
  if (await count(sql, 'users', sql`where is_demo`)) return;
  console.log('[seed] создаю демо-данные…');
  const rnd = mulberry32(20260901);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const DAY = 864e5, HOUR = 36e5;
  const now = new Date();
  const msk = new Date(now.getTime() + 3 * HOUR);
  const startYear = msk.getUTCMonth() >= 8 ? msk.getUTCFullYear() : msk.getUTCFullYear() - 1;
  let start = new Date(Date.UTC(startYear, 8, 1, 6));
  if (now - start < 45 * DAY) start = new Date(now - 60 * DAY);
  const span = now - start;
  const at = (fromShare, toShare) => new Date(start.getTime() + (fromShare + rnd() * (toShare - fromShare)) * span);
  const pw = await hash('golos2026', 10);
  const usedNames = new Set();
  const personName = (fixed) => {
    if (fixed) { usedNames.add(fixed); return fixed; }
    for (;;) {
      const female = rnd() < 0.5;
      const first = female ? pick(FEMALE) : pick(MALE);
      const sur = pick(SURN);
      const last = female ? (sur.endsWith('ий') ? sur.slice(0, -2) + 'ая' : sur + 'а') : sur;
      const full = `${first} ${last}`;
      if (!usedNames.has(full)) { usedNames.add(full); return full; }
    }
  };
  let emailN = 0;
  const translitEmail = () => `amb${++emailN}@demo.golos`;

  // Кураторы: двое для сотрудников, двое для студентов
  const curators = [
    ['Анна Власова', 'kurator1@demo.golos', 'internal'],
    ['Михаил Орлов', 'kurator2@demo.golos', 'internal'],
    ['Екатерина Смирнова', 'kurator3@demo.golos', 'external'],
    ['Денис Петров', 'kurator4@demo.golos', 'external'],
  ];
  const curatorIds = { internal: [], external: [] };
  for (const [name, email, scope] of curators) {
    const [r] = await sql`insert into users (email, password_hash, name, role, curator_scope, status, is_demo, approved_at, created_at, last_active_at)
      values (${email}, ${pw}, ${name}, 'curator', ${scope}, 'active', true, ${start}, ${start}, ${now}) returning id`;
    curatorIds[scope].push(r.id);
  }

  // Архив заданий сезона
  const tasksBySeg = { office: { archive: [], active: [] }, site: { archive: [], active: [] }, uni: { archive: [], active: [] }, college: { archive: [], active: [] } };
  for (const seg of Object.keys(ARCHIVE)) {
    for (const [i, [title, kind, points]] of ARCHIVE[seg].entries()) {
      const createdAt = at((i / 6) * 0.7, (i / 6) * 0.7 + 0.02);
      const id = await insertTask(sql, {
        title, kind, points, segments: [seg], duration: kind === 'event' ? '2 часа' : kind === 'post' ? '20 мин' : '10 мин',
        channel: 'Каналы компании', why: 'Задание прошлого спринта.', steps: ['Выполните задание по инструкции куратора.', 'Пришлите результат на проверку.'],
        submit_types: ['text', 'file'], joint: false, needs_curator: false,
      }, 100 + i, false, createdAt);
      tasksBySeg[seg].archive.push({ id, points, needsCurator: false, title });
    }
  }
  const activeTasks = await sql`select id, title, points, segments, needs_curator from tasks where active order by sort, id`;
  for (const t of activeTasks) for (const seg of t.segments) tasksBySeg[seg]?.active.push({ id: t.id, points: t.points, needsCurator: t.needs_curator, title: t.title });

  // Амбассадоры
  const people = [];
  const ORG = {
    office: (city) => [`Офис дирекции, ${city}`, pick(['Логист', 'Менеджер по развитию сети', 'Специалист по закупкам', 'Аналитик продаж', 'HR-специалист', 'Специалист по маркетингу'])],
    site: () => (rnd() < 0.7 ? [`АЗС № ${100 + Math.floor(rnd() * 400)}`, pick(['Оператор АЗС', 'Старший оператор', 'Менеджер АЗС'])] : ['Нефтебаза', pick(['Мастер нефтебазы', 'Товарный оператор', 'Слесарь-ремонтник'])]),
    uni: () => [pick(['Политехнический университет', 'Технический университет', 'Государственный университет', 'Университет путей сообщения', 'Экономический университет']), `${2 + Math.floor(rnd() * 3)} курс, ${pick(['логистика', 'нефтегазовое дело', 'прикладная информатика', 'менеджмент', 'маркетинг'])}`],
    college: () => [pick(['Нефтяной техникум', 'Политехнический колледж', 'Колледж транспорта и логистики', 'Технологический колледж']), `${1 + Math.floor(rnd() * 3)} курс, ${pick(['хранение и транспортировка нефти', 'автомеханик', 'операционная деятельность в логистике', 'монтаж оборудования'])}`],
  };
  const FIXED = {
    omsk: [
      { name: 'Олег Панин', email: 'oleg@demo.golos', segment: 'site', captain: true, org: ['АЗС № 214', 'Менеджер АЗС'] },
      { name: 'Алина Кузнецова', email: 'alina@demo.golos', segment: 'site', special: 'alina', org: ['АЗС № 118', 'Оператор АЗС'] },
      { name: 'Ирина Ковалёва', email: 'irina@demo.golos', segment: 'office', org: ['Офис дирекции, Омск', 'Менеджер по развитию сети'] },
      { name: 'Даниил Фёдоров', email: 'daniil@demo.golos', segment: 'college', special: 'daniil', org: ['Нефтяной техникум', '2 курс, хранение и транспортировка нефти'] },
    ],
  };
  for (const [regionId, [nInt, nExt]] of Object.entries(COUNTS)) {
    const segs = [];
    const office = Math.floor(nInt / 2);
    for (let i = 0; i < nInt; i++) segs.push(i < office ? 'office' : 'site');
    const uni = Math.ceil(nExt / 2);
    for (let i = 0; i < nExt; i++) segs.push(i < uni ? 'uni' : 'college');
    const fixed = [...(FIXED[regionId] || [])];
    for (const seg of segs) {
      const fi = fixed.findIndex((f) => f.segment === seg);
      const f = fi >= 0 ? fixed.splice(fi, 1)[0] : null;
      const city = REGIONS.find((r) => r.id === regionId).city;
      const [org, position] = f?.org ?? ORG[seg](city);
      people.push({
        regionId, segment: seg, name: personName(f?.name), email: f?.email ?? translitEmail(), org, position,
        captain: !!f?.captain, special: f?.special ?? null,
        active14: f ? true : rnd() < ACTIVITY[regionId], diligence: 0.35 + rnd() * 0.6,
      });
    }
  }
  // Капитаны: по одному в регионе, кроме Челябинска
  for (const regionId of Object.keys(COUNTS)) {
    if (regionId === 'chel') continue;
    const inRegion = people.filter((p) => p.regionId === regionId);
    if (inRegion.some((p) => p.captain)) continue;
    const c = pick(inRegion.filter((p) => !p.special));
    c.captain = true;
  }
  for (const p of people) if (p.captain) { p.active14 = true; p.diligence = 0.95; }

  for (const p of people) {
    const createdAt = at(0, 0.12);
    const [r] = await sql`insert into users (email, password_hash, name, role, segment, region_id, status, is_captain, org, position, is_demo, created_at, approved_at, motivation)
      values (${p.email}, ${pw}, ${p.name}, 'ambassador', ${p.segment}, ${p.regionId}, 'active', ${p.captain}, ${p.org}, ${p.position}, true, ${createdAt}, ${new Date(createdAt.getTime() + 2 * DAY)},
              ${'Хочу рассказывать о работе и помогать новичкам разобраться, как здесь всё устроено.'}) returning id`;
    p.id = r.id;
  }
  const captainOf = {};
  for (const p of people) if (p.captain) captainOf[p.regionId] = p.id;

  // Тандемы: вуз ↔ офис, колледж ↔ объект
  for (const p of people) {
    if (p.segment !== 'uni' && p.segment !== 'college') continue;
    const want = p.segment === 'uni' ? 'office' : 'site';
    const pool = people.filter((x) => x.regionId === p.regionId && x.segment === want);
    const any = people.filter((x) => x.regionId === p.regionId && (x.segment === 'office' || x.segment === 'site'));
    const mentor = p.special === 'daniil' ? people.find((x) => x.special === 'alina') : pick(pool.length ? pool : any);
    if (mentor) await sql`update users set mentor_id = ${mentor.id} where id = ${p.id}`;
  }

  // Сдачи заданий
  const subs = [];
  const RETURN_NOTES = ['Не слышно вторую половину записи, перезапишите, пожалуйста.', 'В кадре видна панель с ценами поставок — переснимите с другого ракурса.', 'Добавьте пару предложений о том, что было самым полезным.'];
  const reviewer = (p, task) => {
    const cap = captainOf[p.regionId];
    if (!task.needsCurator && cap && cap !== p.id && rnd() < 0.68) return { id: cap, role: 'captain' };
    const group = p.segment === 'office' || p.segment === 'site' ? 'internal' : 'external';
    return { id: pick(curatorIds[group]), role: 'curator' };
  };
  for (const p of people) {
    const pool = tasksBySeg[p.segment];
    if (p.special === 'alina') {
      const a = pool.archive, act = pool.active;
      for (const t of [a[0], a[1], a[2], a[4]]) subs.push({ p, t, status: 'approved', created: at(0.1, 0.68) });
      const mentor = act.find((t) => t.title === 'Наставник недели');
      const voice = act.find((t) => t.title === 'Голосовая история');
      if (mentor) subs.push({ p, t: mentor, status: 'approved', created: new Date(now - 6 * DAY) });
      if (voice) subs.push({ p, t: voice, status: 'returned', created: new Date(now - 3 * DAY), comment: RETURN_NOTES[0] });
      continue;
    }
    for (const [i, t] of pool.archive.entries()) {
      if (rnd() < p.diligence) {
        const created = at((i / 6) * 0.7, ((i + 1) / 6) * 0.7);
        if (rnd() < 0.04) subs.push({ p, t, status: 'returned', created, comment: pick(RETURN_NOTES) });
        else subs.push({ p, t, status: 'approved', created });
      }
    }
    if (p.active14) {
      let made = 0;
      for (const t of pool.active) {
        if (rnd() < p.diligence * 0.75) {
          const ageDays = 0.2 + rnd() * 12;
          const created = new Date(now - ageDays * DAY);
          subs.push({ p, t, status: ageDays < 3 ? 'pending' : 'approved', created });
          made++;
        }
      }
      if (!made && pool.active.length) {
        const t = pick(pool.active);
        subs.push({ p, t, status: 'approved', created: new Date(now - (4 + rnd() * 9) * DAY) });
      }
    }
  }
  const pointsBy = new Map();
  const lastBy = new Map();
  const rows = subs.map(({ p, t, status, created, comment }) => {
    const rv = status === 'pending' ? null : reviewer(p, t);
    const reviewedAt = status === 'pending' ? null : new Date(Math.min(now.getTime() - HOUR, created.getTime() + (3 + rnd() * 40) * HOUR));
    const awarded = status === 'approved' ? t.points : 0;
    pointsBy.set(p.id, (pointsBy.get(p.id) || 0) + awarded);
    if (!lastBy.get(p.id) || lastBy.get(p.id) < created) lastBy.set(p.id, created);
    const body = BODIES[Math.floor(rnd() * BODIES.length)];
    return {
      user_id: p.id, task_id: t.id, status, body, link: null, file_url: null, file_name: null, flagged: t.needsCurator,
      comment: comment ?? null, reviewer_id: rv?.id ?? null, reviewer_role: rv?.role ?? null, points_awarded: awarded,
      created_at: created, reviewed_at: reviewedAt,
    };
  });
  for (let i = 0; i < rows.length; i += 200) await sql`insert into submissions ${sql(rows.slice(i, i + 200))}`;

  // Начисления за мероприятия: капитанам — до уровня «Лидер», части амбассадоров — за ярмарки
  const adjustments = [];
  for (const p of people) {
    const pts = pointsBy.get(p.id) || 0;
    if (p.captain) {
      const add = Math.max(150, 1230 - pts + Math.floor(rnd() * 140));
      adjustments.push({ user_id: p.id, amount: add, reason: 'Организация встреч амбассадоров региона', author_id: curatorIds.internal[0], created_at: at(0.3, 0.9) });
    } else if (p.special === 'alina') {
      if (pts < 480) adjustments.push({ user_id: p.id, amount: 480 - pts, reason: 'Помощь на дне открытых дверей АЗС', author_id: curatorIds.internal[0], created_at: at(0.5, 0.8) });
    } else if (rnd() < 0.18) {
      adjustments.push({ user_id: p.id, amount: 50, reason: 'Дежурство на ярмарке вакансий', author_id: pick(curatorIds.external), created_at: at(0.2, 0.9) });
    }
  }
  if (adjustments.length) await sql`insert into point_adjustments ${sql(adjustments)}`;
  for (const a of adjustments) pointsBy.set(a.user_id, (pointsBy.get(a.user_id) || 0) + a.amount);

  for (const p of people) {
    const last = lastBy.get(p.id);
    const lastActive = p.active14 ? new Date(Math.max(last?.getTime() || 0, now - rnd() * 4 * DAY)) : new Date(Math.min(last?.getTime() || now - 20 * DAY, now - (15 + rnd() * 12) * DAY));
    await sql`update users set points = ${pointsBy.get(p.id) || 0}, last_active_at = ${lastActive} where id = ${p.id}`;
  }

  // Заявки на обмен баллов
  const rewards = await sql`select id, cost, audience, min_level from rewards where active order by cost`;
  const levelOf = (pts) => (pts >= 1200 ? 4 : pts >= 600 ? 3 : pts >= 200 ? 2 : 1);
  let made = 0;
  for (const p of [...people].sort(() => rnd() - 0.5)) {
    if (made >= 10) break;
    if (p.special) continue;
    const pts = pointsBy.get(p.id) || 0;
    const group = p.segment === 'office' || p.segment === 'site' ? 'internal' : 'external';
    const r = rewards.find((x) => x.cost <= pts && x.min_level <= levelOf(pts) && (x.audience === 'all' || x.audience === group) && rnd() < 0.5);
    if (!r) continue;
    const fulfilled = made % 2 === 0;
    const created = at(0.4, 0.95);
    await sql`insert into redemptions (user_id, reward_id, cost, status, created_at, resolved_at) values (${p.id}, ${r.id}, ${r.cost}, ${fulfilled ? 'fulfilled' : 'requested'}, ${created}, ${fulfilled ? new Date(created.getTime() + 2 * DAY) : null})`;
    await sql`update users set spent = spent + ${r.cost} where id = ${p.id}`;
    made++;
  }

  // Новые заявки в программу
  const APPS = [
    ['Валерия Громова', 'uni', 'nsk', 'Технический университет', '2 курс, логистика', 'Хочу организовать в вузе встречу с сотрудниками и узнать больше про практику в логистике.'],
    ['Максим Зотов', 'site', 'ekb', 'АЗС № 307', 'Оператор АЗС', 'Работаю третий год, могу рассказать студентам колледжа, как устроена смена.'],
    ['Софья Литвинова', 'college', 'chel', 'Политехнический колледж', '2 курс, хранение и транспортировка нефти', 'Мне 17 лет, родители согласны. Хочу помогать с экскурсиями и стендом в колледже.'],
    ['Артур Хабибуллин', 'office', 'tmn', 'Офис дирекции, Тюмень', 'Аналитик продаж', 'Готов рассказывать про аналитику на АЗС и выступать на днях карьеры.'],
  ];
  for (const [i, [name, segment, regionId, org, position, motivation]] of APPS.entries()) {
    await sql`insert into users (email, password_hash, name, role, segment, region_id, status, org, position, motivation, is_demo, created_at)
      values (${`zayavka${i + 1}@demo.golos`}, ${pw}, ${name}, 'ambassador', ${segment}, ${regionId}, 'pending', ${org}, ${position}, ${motivation}, true, ${new Date(now - (0.3 + i * 0.6) * DAY)})`;
  }

  // Уведомления для демо-амбассадора
  const alina = people.find((p) => p.special === 'alina');
  const oleg = people.find((p) => p.email === 'oleg@demo.golos');
  if (alina) {
    const voice = tasksBySeg.site.active.find((t) => t.title === 'Голосовая история');
    const notes = [
      [`Капитан вернул задание «Голосовая история»: ${RETURN_NOTES[0]}`, voice ? `/me/tasks/${voice.id}` : '/me/tasks', 3, false],
      ['Задание «Наставник недели» принято: +60 баллов', '/me/tasks', 5, false],
      ['Начислено бонусных баллов: помощь на дне открытых дверей АЗС', '/me/profile', 20, true],
      ['Добро пожаловать в программу! Начните с заданий недели.', '/me/tasks', 55, true],
    ];
    for (const [text, href, days, read] of notes) {
      await sql`insert into notifications (user_id, text, href, read, created_at) values (${alina.id}, ${text}, ${href}, ${read}, ${new Date(now - days * DAY)})`;
    }
  }
  if (oleg) await sql`insert into notifications (user_id, text, href, created_at) values (${oleg.id}, 'В вашем регионе есть задания на проверку', '/me/review', ${new Date(now - 2 * HOUR)})`;

  // Внешние метрики по месяцам (вносят кураторы)
  const BASE = { reach: 168000, interactions: 7300, career_visits: 860, applications: 121, hires: 9, referral_candidates: 11, referral_hires: 4, internship_applications: 17 };
  let m = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const thisMonth = new Date(Date.UTC(msk.getUTCFullYear(), msk.getUTCMonth(), 1));
  let k = 1;
  while (m < thisMonth) {
    const key = `${m.getUTCFullYear()}-${String(m.getUTCMonth() + 1).padStart(2, '0')}`;
    const g = 1 + (k - 1) * 0.45;
    await sql`insert into metrics (month, reach, interactions, career_visits, applications, hires, referral_candidates, referral_hires, internship_applications)
      values (${key}, ${Math.round(BASE.reach * g)}, ${Math.round(BASE.interactions * g)}, ${Math.round(BASE.career_visits * g)}, ${Math.round(BASE.applications * g)},
              ${Math.round(BASE.hires * g)}, ${Math.round(BASE.referral_candidates * g)}, ${Math.round(BASE.referral_hires * g)}, ${Math.round(BASE.internship_applications * g)})
      on conflict (month) do nothing`;
    m = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 1));
    k++;
  }
  console.log(`[seed] демо: ${people.length} амбассадоров, ${rows.length} сдач заданий`);
}

const BODIES = [
  'Сделали пост о команде, получили много вопросов в комментариях про стажировку.',
  'Отчёт: пришли 18 студентов, больше всего спрашивали про первый год работы.',
  'Фото рабочего места и короткая подпись о том, за что ценю свою работу.',
  'Рассказал о наставнике, который помог в первые недели на объекте.',
  'Сняли ролик на 30 секунд по сценарию из контент-кита.',
  'Опубликовали объявление о практике в паблике и на стенде.',
  'Провели встречу с группой колледжа, показали работу смены.',
  'Пост о том, как мы готовим АЗС к зиме, с фото коллег.',
];
