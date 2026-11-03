export type Segment = 'office' | 'site' | 'uni' | 'college';
export type Group = 'internal' | 'external';
export type Kind = 'photo' | 'voice' | 'video' | 'post' | 'event' | 'link';
export type SubmitType = 'text' | 'link' | 'file';
export type SubmissionStatus = 'pending' | 'approved' | 'returned';
export type UserStatus = 'pending' | 'active' | 'paused' | 'rejected';

export const SEGMENTS: Record<Segment, { label: string; long: string; group: Group; hint: string; orgLabel: string; posLabel: string; orgPlaceholder: string; posPlaceholder: string }> = {
  office: { label: 'Офис', long: 'Сотрудник офиса', group: 'internal', hint: 'Посты, отзывы, выступления, реферальная программа', orgLabel: 'Подразделение', posLabel: 'Должность', orgPlaceholder: 'Офис дирекции, Омск', posPlaceholder: 'Логист' },
  site: { label: 'АЗС и нефтебаза', long: 'Сотрудник на объекте', group: 'internal', hint: 'Задания на 5–10 минут с телефона, можно голосом', orgLabel: 'Объект', posLabel: 'Должность', orgPlaceholder: 'АЗС № 118', posPlaceholder: 'Оператор АЗС' },
  uni: { label: 'Студент вуза', long: 'Студент вуза', group: 'external', hint: 'Мероприятия, ярмарки и контент в вузе', orgLabel: 'Вуз', posLabel: 'Курс и направление', orgPlaceholder: 'Технический университет', posPlaceholder: '3 курс, логистика' },
  college: { label: 'Студент колледжа', long: 'Студент колледжа', group: 'external', hint: 'Экскурсии на объекты, стенды, короткие видео', orgLabel: 'Колледж', posLabel: 'Курс и специальность', orgPlaceholder: 'Нефтяной техникум', posPlaceholder: '2 курс, хранение нефти' },
};
export const SEGMENT_KEYS = Object.keys(SEGMENTS) as Segment[];
export const isSegment = (v: unknown): v is Segment => typeof v === 'string' && v in SEGMENTS;
export const groupOf = (s: Segment | null | undefined): Group => (s === 'uni' || s === 'college' ? 'external' : 'internal');
export const GROUP_LABEL: Record<Group, string> = { internal: 'Сотрудники', external: 'Студенты' };
export const segmentsOf = (g: Group): Segment[] => (g === 'internal' ? ['office', 'site'] : ['uni', 'college']);

export const LEVELS = [
  { n: 1, name: 'Старт', min: 0, unlocks: ['Онбординг и первые задания', 'Контент-кит и конструктор поста', 'Чат амбассадоров региона'] },
  { n: 2, name: 'Голос', min: 200, unlocks: ['Все форматы заданий', 'Тандем с наставником или студентами', 'Витрина мерча и обучения'] },
  { n: 3, name: 'Эксперт', min: 600, unlocks: ['Выступления на мероприятиях компании', 'Закрытые встречи с руководителями', 'Награды уровня «Эксперт»'] },
  { n: 4, name: 'Лидер', min: 1200, unlocks: ['Можно стать капитаном региона', 'Прямой канал с кураторами', 'Поездка на форум амбассадоров'] },
] as const;
export type Level = (typeof LEVELS)[number];
export const levelOf = (points: number): Level => LEVELS.reduce<Level>((a, l) => (points >= l.min ? l : a), LEVELS[0]);
export const nextLevel = (l: Level): Level | null => LEVELS.find((x) => x.n === l.n + 1) ?? null;
export function levelProgress(points: number) {
  const lv = levelOf(points);
  const nx = nextLevel(lv);
  const pct = nx ? Math.round(((points - lv.min) / (nx.min - lv.min)) * 100) : 100;
  return { lv, nx, pct, toNext: nx ? nx.min - points : 0 };
}

export const KINDS: Record<Kind, { label: string; icon: 'camera' | 'mic' | 'video' | 'pen' | 'users' | 'link' }> = {
  photo: { label: 'Фото', icon: 'camera' },
  voice: { label: 'Голосовое', icon: 'mic' },
  video: { label: 'Видео', icon: 'video' },
  post: { label: 'Текст', icon: 'pen' },
  event: { label: 'Встреча', icon: 'users' },
  link: { label: 'Ссылка', icon: 'link' },
};
export const KIND_KEYS = Object.keys(KINDS) as Kind[];
export const SUBMIT_LABEL: Record<SubmitType, string> = { text: 'Текст', link: 'Ссылка', file: 'Файл' };

export const MONTHS = [
  { m: 8, short: 'Сен', k: 'prep', now: 'Сентябрь: набор и отбор амбассадоров' },
  { m: 9, short: 'Окт', k: 'prep', now: 'Октябрь: онбординг и первые задания' },
  { m: 10, short: 'Ноя', k: 'sprint', now: 'Ноябрь: спринт «Люди и наставники»' },
  { m: 11, short: 'Дек', k: 'sprint', now: 'Декабрь: спринт «Итоги года»' },
  { m: 0, short: 'Янв', k: 'sprint', now: 'Январь: спринт «Технологии на АЗС»' },
  { m: 1, short: 'Фев', k: 'sprint', now: 'Февраль: спринт «Карьера и обучение»' },
  { m: 2, short: 'Мар', k: 'sprint', now: 'Март: спринт «Культура безопасности»' },
  { m: 3, short: 'Апр', k: 'fest', now: 'Апрель: фестиваль и форум амбассадоров' },
  { m: 4, short: 'Май', k: 'final', now: 'Май: итоги сезона и награды' },
] as const;

const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

/** Текущий сезон по московскому времени. Сезон идёт с сентября по май. */
export function seasonInfo(now = new Date()) {
  const msk = new Date(now.getTime() + 3 * 3600_000);
  const y = msk.getUTCFullYear();
  const m = msk.getUTCMonth();
  const startYear = m >= 8 ? y : y - 1;
  const idx = MONTHS.findIndex((x) => x.m === m);
  const start = new Date(Date.UTC(startYear, 8, 1, -3));
  const months: { key: string; label: string }[] = [];
  for (let i = 0; i < 9; i++) {
    const d = new Date(Date.UTC(startYear, 8 + i, 1));
    months.push({ key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`, label: `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}` });
  }
  const currentKey = `${y}-${String(m + 1).padStart(2, '0')}`;
  return {
    label: `${startYear}/${String((startYear + 1) % 100).padStart(2, '0')}`,
    start,
    monthIdx: idx,
    current: idx >= 0 ? MONTHS[idx] : null,
    monthsPassed: idx >= 0 ? idx : 9,
    months,
    currentKey,
  };
}

export const WEEK_GOAL = 3;
export const REWARD_CATEGORIES = ['Признание', 'Развитие', 'Карьера', 'Мерч'] as const;
export const AUDIENCE_LABEL: Record<'all' | Group, string> = { all: 'Все', internal: 'Сотрудники', external: 'Студенты' };

/** Цели сезона для метрик программы. */
export const TARGETS = {
  activeShare: 70,
  tasksPerMonth: 3,
  reach: 1_500_000,
  er: 4,
  siteShare: 30,
  referralCandidates: 120,
  referralHires: 40,
  internshipApplications: 150,
  initiativeIndex: 30,
  mixedTeams: 50,
  replicated: 25,
  retention: 75,
};

/* ---------- инициативы ---------- */
export type InitiativeFormat = 'interview' | 'event' | 'excursion' | 'content' | 'masterclass' | 'challenge';
export type InitiativeStatus = 'idea' | 'recruiting' | 'active' | 'reporting' | 'done' | 'declined';
export type MemberStatus = 'requested' | 'accepted' | 'declined';

export const FORMATS: Record<InitiativeFormat, { label: string; icon: 'video' | 'users' | 'map' | 'pen' | 'star' | 'repeat' }> = {
  interview: { label: 'Видеоинтервью', icon: 'video' },
  event: { label: 'Встреча', icon: 'users' },
  excursion: { label: 'Экскурсия', icon: 'map' },
  content: { label: 'Серия публикаций', icon: 'pen' },
  masterclass: { label: 'Мастер-класс', icon: 'star' },
  challenge: { label: 'Региональный вызов', icon: 'repeat' },
};
export const FORMAT_KEYS = Object.keys(FORMATS) as InitiativeFormat[];

/** Четыре шага, которые видит участник. «Итоги на проверке» — часть шага «в работе». */
export const INITIATIVE_STEPS = [
  { key: 'idea', label: 'Идея' },
  { key: 'recruiting', label: 'Набор команды' },
  { key: 'active', label: 'В работе' },
  { key: 'done', label: 'Завершена' },
] as const;
export const stepIndex = (s: InitiativeStatus) =>
  s === 'idea' || s === 'declined' ? 0 : s === 'recruiting' ? 1 : s === 'active' || s === 'reporting' ? 2 : 3;

export const INITIATIVE_STATUS: Record<InitiativeStatus, { label: string; tone: '' | 'brand' | 'accent' | 'good' | 'warn' | 'bad' }> = {
  idea: { label: 'На согласовании', tone: 'warn' },
  recruiting: { label: 'Набор команды', tone: 'accent' },
  active: { label: 'В работе', tone: 'brand' },
  reporting: { label: 'Итоги на проверке', tone: 'warn' },
  done: { label: 'Завершена', tone: 'good' },
  declined: { label: 'Не согласована', tone: 'bad' },
};

/** Баллы начисляются, когда куратор принимает итоги. Главное — авторство и командная работа. */
export const INITIATIVE_POINTS = {
  author: 200,
  member: 100,
  mixed: 50,
  replicated: 150,
};

/**
 * Готовые совместные механики: с них удобно начать первую инициативу.
 * Каждая собирает в одной команде сотрудников и студентов.
 */
export const JOINT_TEMPLATES: { key: string; title: string; format: InitiativeFormat; summary: string; goal: string; roles: string; lookingFor: Segment[] }[] = [
  {
    key: 'voice',
    title: 'Голос профессии',
    format: 'interview',
    summary: 'Студент берёт интервью у сотрудника: как он пришёл в профессию, как устроен его день и что бы он посоветовал себе на первом курсе. Студент отвечает за вопросы, съёмку и монтаж, сотрудник делится опытом.',
    goal: 'Три коротких ролика до 90 секунд для паблика вуза и корпоративного канала, сценарий для повторения в других городах.',
    roles: 'Студент на вопросы и монтаж, сотрудник офиса или АЗС как герой интервью',
    lookingFor: ['uni', 'college', 'site', 'office'],
  },
  {
    key: 'three',
    title: 'Один вопрос, три взгляда',
    format: 'content',
    summary: 'Офисный сотрудник, работник АЗС или нефтебазы и студент отвечают на один вопрос: например, что такое хорошая смена или как выглядит первый рабочий год. Три ответа складываются в одну публикацию.',
    goal: 'Серия из четырёх публикаций в корпоративных каналах и на площадках вузов, отклики аудитории.',
    roles: 'Сотрудник офиса, сотрудник АЗС или нефтебазы, студент на текст и оформление',
    lookingFor: ['office', 'site', 'uni', 'college'],
  },
  {
    key: 'challenge',
    title: 'Региональный вызов',
    format: 'challenge',
    summary: 'Команда проводит формат у себя и бросает вызов соседнему региону: повторить его для своей аудитории и поделиться результатом. Готовый сценарий сохраняется в библиотеке.',
    goal: 'Проведённое мероприятие, инструкция для повторения и хотя бы один регион, который принял вызов.',
    roles: 'Организатор, ведущий, человек на съёмку и отчёт',
    lookingFor: ['office', 'site', 'uni', 'college'],
  },
];

/**
 * Приоритет при отборе на практику — статус, а не товар за баллы.
 * Студент заслуживает его вкладом: уровень «Эксперт» и участие в завершённой инициативе.
 */
export const PRIORITY_RULE = { minLevel: 3, initiatives: 1 };
export function practicePriority(segment: Segment | null | undefined, points: number, doneInitiatives: number) {
  const external = groupOf(segment) === 'external';
  const lv = levelOf(points);
  const levelOk = lv.n >= PRIORITY_RULE.minLevel;
  const initiativeOk = doneInitiatives >= PRIORITY_RULE.initiatives;
  return { applies: external, earned: external && levelOk && initiativeOk, levelOk, initiativeOk };
}

export const STATUS_LABEL: Record<UserStatus, string> = { pending: 'Заявка', active: 'Активен', paused: 'На паузе', rejected: 'Отклонён' };
