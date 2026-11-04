// Демо-набор для скриншотов презентации. Запускается только в CI на временной базе.
// Повторяет ключевые цифры рабочего сайта: 97 амбассадоров, 11 регионов, 22 завершённых проекта,
// 19 смешанных команд, 7 повторов, внешние KPI за сентябрь и октябрь.
import postgres from 'postgres';
import { seedDemo } from './old-seed.mjs';

const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, onnotice: () => {} });
const DAY = 864e5;
const now = Date.now();
const ago = (d) => new Date(now - d * DAY);

let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const pick = (a) => a[Math.floor(rnd() * a.length)];

await seedDemo(sql);

const people = await sql`
  select id, name, segment, region_id, email from users where role = 'ambassador' and status = 'active' order by id`;
const byRegion = {};
for (const p of people) (byRegion[p.region_id] ??= []).push(p);
const isInt = (p) => p.segment === 'office' || p.segment === 'site';
const alina = people.find((p) => p.email === 'alina@demo.golos');
const daniil = people.find((p) => p.email === 'daniil@demo.golos');
const [curator] = await sql`select id from users where email = 'kurator1@demo.golos'`;

const usedAuthors = new Set([alina.id, daniil.id]);
function author(region, preferInt) {
  const pool = byRegion[region].filter((p) => !usedAuthors.has(p.id));
  const pref = pool.filter((p) => isInt(p) === preferInt);
  const a = (pref.length ? pref : pool)[0];
  usedAuthors.add(a.id);
  return a;
}
function team(region, a, size, mixed) {
  const pool = byRegion[region].filter((p) => p.id !== a.id && p.id !== alina.id && p.id !== daniil.id);
  const out = [];
  if (mixed) {
    const other = pool.filter((p) => isInt(p) !== isInt(a));
    if (other.length) out.push(other[Math.floor(rnd() * other.length)]);
  } else {
    // команда из одной группы
    const same = pool.filter((p) => isInt(p) === isInt(a));
    for (const p of same) { if (out.length >= size - 1) break; out.push(p); }
    return out;
  }
  for (const p of pool) {
    if (out.length >= size - 1) break;
    if (!out.includes(p)) out.push(p);
  }
  return out;
}

const FMT_LOOK = { interview: ['uni', 'site'], event: ['office', 'uni'], excursion: ['college', 'site'], content: ['uni', 'office', 'site'], masterclass: ['site', 'college'], challenge: ['office', 'site', 'uni', 'college'] };
const SUMMARY = {
  interview: 'Студенты берут короткие интервью у сотрудников: как они пришли в профессию и что посоветовали бы себе на первом курсе. Сотрудник делится опытом, студенты отвечают за вопросы, съёмку и монтаж.',
  event: 'Неформальная встреча студентов с сотрудниками: короткие истории о работе и час вопросов без презентаций. Студенты собирают аудиторию, сотрудники готовят по одной истории.',
  excursion: 'Группа студентов знакомится с работой объекта в согласованной зоне: инструктаж, рассказ смены, ответы на вопросы о практике. Студенты снимают короткий ролик по сценарию из кита.',
  content: 'Серия публикаций, где сотрудники и студенты отвечают на один вопрос о работе. Ответы собираются в карточки для корпоративных каналов и пабликов вузов.',
  masterclass: 'Сотрудник проводит практическое занятие для студентов: показывает одну рабочую задачу от начала до конца. Студенты готовят анонс и отчёт.',
  challenge: 'Команда проводит формат у себя и передаёт сценарий соседнему региону, чтобы тот повторил его для своей аудитории.',
};
const GOAL = {
  interview: 'Три ролика до 90 секунд для паблика вуза и корпоративного канала, сценарий для повторения.',
  event: 'Встреча на 20–30 студентов, вопросы для FAQ о практике, отчёт с фото.',
  excursion: 'Экскурсия для группы 8–12 человек, ролик до 60 секунд, список вопросов о практике.',
  content: 'Четыре публикации в корпоративных каналах и на площадках вузов.',
  masterclass: 'Занятие на 15–25 человек и инструкция, чтобы его повторили в другом городе.',
  challenge: 'Проведённый формат, инструкция и хотя бы один регион, который принял вызов.',
};

// [название, формат, регион, предпочесть сотрудника-автора, смешанная]
const ORIGINALS = [
  ['Голос профессии: первый год на АЗС', 'interview', 'nsk', false, true],
  ['Один вопрос, три взгляда: какая смена хорошая', 'content', 'tomsk', true, true],
  ['Экскурсия на нефтебазу для колледжа', 'excursion', 'tmn', true, true],
  ['Карьерный завтрак с логистами', 'event', 'ekb', true, true],
  ['Один день в профессии', 'challenge', 'krsk', false, true],
  ['Профессии без стереотипов', 'content', 'msk', false, true],
  ['Как устроена АЗС изнутри', 'masterclass', 'chel', true, true],
  ['Наставник рядом: три истории', 'interview', 'spb', false, true],
  ['Ярмарка вакансий глазами студентов', 'content', 'yar', false, false],
  ['Смена вместе: студенты колледжа на АЗС', 'excursion', 'omsk', true, true],
  ['Карьерный десант в политех', 'event', 'nnov', true, true],
  ['Безопасность без скуки', 'masterclass', 'omsk', true, true],
  ['Цифровая АЗС: экскурсия для IT-студентов', 'excursion', 'spb', true, true],
  ['Три пути в профессию', 'interview', 'msk', false, true],
  ['Вопросы о практике: честные ответы', 'event', 'nsk', true, true],
  ['Логистика топлива за 90 секунд', 'content', 'ekb', true, false],
  ['Письмо себе-первокурснику', 'content', 'tmn', false, true],
  ['Квест по нефтебазе', 'challenge', 'tomsk', true, false],
];
// [индекс оригинала, регион повтора, статус]
const REPLICAS = [
  [4, 'nnov', 'done'], [0, 'omsk', 'done'], [3, 'chel', 'done'], [2, 'tomsk', 'done'],
  [9, 'ekb', 'active'], [5, 'yar', 'reporting'], [1, 'krsk', 'recruiting'],
];
const CITY = Object.fromEntries((await sql`select id, city from regions`).map((r) => [r.id, r.city]));

async function create({ title, format, region, a, members, status, sourceId = null, doneDays = null, requests = [] }) {
  const created = ago((doneDays ?? 10) + 18 + Math.floor(rnd() * 10));
  const done = status === 'done';
  const [row] = await sql`
    insert into initiatives (author_id, source_id, title, format, region_id, audience, summary, goal, looking_for, roles, team_size, on_site, status,
      result, playbook, reach, audience_count, audience_score, reviewer_id, created_at, approved_at, started_at, reported_at, done_at)
    values (${a.id}, ${sourceId}, ${title}, ${format}, ${region}, ${format === 'excursion' ? 'Студенты колледжей' : 'Студенты вузов и колледжей'},
      ${SUMMARY[format]}, ${GOAL[format]}, ${sql.array(FMT_LOOK[format])}, 'Организатор, ведущий, человек на съёмку и отчёт', ${Math.max(4, members.length + 2)},
      ${format === 'excursion' || format === 'masterclass'}, ${status},
      ${done ? 'Провели формат, собрали вопросы аудитории и опубликовали материалы в корпоративных каналах и пабликах вузов.' : null},
      ${done ? '1. Согласуйте дату и площадку с куратором. 2. Соберите команду из сотрудников и студентов. 3. Проведите формат по сценарию. 4. Опубликуйте материалы с #ГолосКомпании.' : null},
      ${done ? 2000 + Math.floor(rnd() * 9000) : null}, ${done ? 15 + Math.floor(rnd() * 40) : null}, ${done ? 4.3 + Math.round(rnd() * 6) / 10 : null},
      ${status === 'idea' ? null : curator.id}, ${created},
      ${status === 'idea' ? null : new Date(created.getTime() + 2 * DAY)},
      ${['active', 'reporting', 'done'].includes(status) ? new Date(created.getTime() + 6 * DAY) : null},
      ${['reporting', 'done'].includes(status) ? ago((doneDays ?? 3) + 2) : null},
      ${done ? ago(doneDays) : null})
    returning id`;
  await sql`insert into initiative_members (initiative_id, user_id, status, created_at, decided_at) values (${row.id}, ${a.id}, 'accepted', ${created}, ${created})`;
  for (const m of members) {
    await sql`insert into initiative_members (initiative_id, user_id, status, created_at, decided_at)
              values (${row.id}, ${m.id}, 'accepted', ${new Date(created.getTime() + 3 * DAY)}, ${new Date(created.getTime() + 4 * DAY)}) on conflict do nothing`;
  }
  for (const m of requests) {
    await sql`insert into initiative_members (initiative_id, user_id, status, note, created_at)
              values (${row.id}, ${m.id}, 'requested', 'Могу помочь со съёмкой и монтажом', ${ago(1)}) on conflict do nothing`;
  }
  return row.id;
}

const award = async (id, amount, reason) => {
  await sql`insert into point_adjustments (user_id, amount, reason, author_id, created_at) values (${id}, ${amount}, ${reason}, ${curator.id}, ${ago(5)})`;
  await sql`update users set points = points + ${amount} where id = ${id}`;
};

const originals = [];
for (const [i, [title, format, region, preferInt, mixed]] of ORIGINALS.entries()) {
  const a = author(region, preferInt);
  const members = team(region, a, 3 + (i % 3), mixed);
  const doneDays = 8 + ((i * 7) % 40);
  const id = await create({ title, format, region, a, members, status: 'done', doneDays });
  originals.push({ id, a, region, title, format, members, mixed });
  await award(a.id, 200 + (mixed ? 50 : 0), `Инициатива «${title}» завершена`);
  for (const m of members) await award(m.id, 100 + (mixed ? 50 : 0), `Участие в инициативе «${title}»`);
}
for (const [idx, region, status] of REPLICAS) {
  const src = originals[idx];
  const a = author(region, rnd() < 0.5);
  const members = status === 'recruiting' ? [] : team(region, a, 3, true);
  const requests = status === 'recruiting' ? byRegion[region].filter((p) => p.id !== a.id).slice(0, 2) : [];
  const title = `${src.title.split(':')[0]} — ${CITY[region]}`;
  await create({ title, format: src.format, region, a, members, status, sourceId: src.id, doneDays: status === 'done' ? 4 + Math.floor(rnd() * 10) : null, requests });
  if (status === 'done') {
    await award(a.id, 250, `Инициатива «${title}» завершена`);
    for (const m of members) await award(m.id, 150, `Участие в инициативе «${title}»`);
    await award(src.a.id, 150, `Формат «${src.title}» повторили в регионе ${CITY[region]}`);
  }
}

// В Омске Алина и Даниил вместе готовят экскурсию: тандем «сотрудник АЗС + студент колледжа»
const omskTeam = byRegion.omsk.filter((p) => p.id !== alina.id && p.id !== daniil.id && p.segment === 'college').slice(0, 1);
await create({ title: 'Экскурсия на АЗС для первого курса', format: 'excursion', region: 'omsk', a: alina, members: [daniil, ...omskTeam], status: 'active' });

// Открытые проекты: идеи и набор команды
const nskA = author('nsk', false);
await create({ title: 'Подкаст «Смена»: разговоры с операторами', format: 'interview', region: 'nsk', a: nskA, members: [], status: 'recruiting',
  requests: byRegion.nsk.filter((p) => p.id !== nskA.id && isInt(p)).slice(0, 1) });
const tomskA = author('tomsk', false);
await create({ title: 'Вместе про карьеру — Томск', format: 'challenge', region: 'tomsk', a: tomskA, members: [], status: 'recruiting',
  requests: byRegion.tomsk.filter((p) => p.id !== tomskA.id).slice(0, 1) });
await create({ title: 'День открытых дверей для родителей студентов', format: 'event', region: 'spb', a: author('spb', true), members: [], status: 'idea' });
await create({ title: 'Мастер-класс: съёмка на телефон за 10 минут', format: 'masterclass', region: 'ekb', a: author('ekb', false), members: [], status: 'idea' });

// Удержание: 23 участника со стажем 60+ дней, из них 22 активны за последний месяц
await sql`update users set approved_at = now() - (interval '1 day' * (30 + (id % 25))), created_at = now() - (interval '1 day' * (32 + (id % 25)))
          where role = 'ambassador' and status = 'active'`;
const recent = await sql`
  select u.id from users u where u.role = 'ambassador' and u.status = 'active' and u.id not in (${alina.id}, ${daniil.id})
    and exists (select 1 from submissions s where s.user_id = u.id and s.created_at > now() - interval '30 days')
  order by u.id limit 22`;
const quiet = await sql`
  select u.id from users u where u.role = 'ambassador' and u.status = 'active'
    and not exists (select 1 from initiative_members m where m.user_id = u.id)
    and u.id not in ${sql(recent.map((r) => r.id))}
  order by u.id desc limit 1`;
await sql`delete from submissions where user_id = ${quiet[0].id} and created_at > now() - interval '30 days'`;
const veterans = [...recent.map((r) => r.id), quiet[0].id];
await sql`update users set approved_at = now() - interval '62 days', created_at = now() - interval '64 days' where id in ${sql(veterans)}`;

// Внешние KPI: те же модельные значения, что на рабочем сайте
await sql`delete from metrics`;
const msk = new Date(now + 3 * 3600e3);
const y = msk.getUTCMonth() >= 8 ? msk.getUTCFullYear() : msk.getUTCFullYear() - 1;
await sql`insert into metrics (month, reach, interactions, career_visits, applications, hires, referral_candidates, referral_hires, internship_applications, is_demo) values
  (${`${y}-09`}, 110000, 5600, 690, 46, 5, 10, 2, 24, true),
  (${`${y}-10`}, 215000, 11400, 1420, 112, 13, 22, 6, 44, true)`;

const [s] = await sql`
  select (select count(*)::int from users where role = 'ambassador' and status = 'active') as active,
         (select count(*)::int from initiatives where status = 'done') as done,
         (select count(distinct region_id)::int from users where role = 'ambassador' and status = 'active') as regions,
         (select count(*)::int from initiatives where source_id is not null and status not in ('idea', 'declined')) as replicas`;
console.log('[deck-seed]', s);
await sql.end();
