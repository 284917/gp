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
export const REWARD_CATEGORIES = ['Признание', 'Развитие', 'Карьера', 'Мерч', 'Бонусы'] as const;
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
};

export const STATUS_LABEL: Record<UserStatus, string> = { pending: 'Заявка', active: 'Активен', paused: 'На паузе', rejected: 'Отклонён' };
