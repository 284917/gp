import { db } from './db';
import { TARGETS, seasonInfo, type Segment } from './domain';
import { fmtCompact, fmtDateShort, pct } from './format';

export type MetricRow = { name: string; now: string; target: string; status: 'ok' | 'plan' | 'low' | 'later' };

export async function getProgramStats() {
  const sql = db();
  const season = seasonInfo();
  const start = season.start;

  const segRows = await sql<{ segment: Segment; total: number; active14: number }[]>`
    select u.segment, count(*)::int as total,
      count(*) filter (where exists (select 1 from submissions s where s.user_id = u.id and s.created_at > now() - interval '14 days'))::int as active14
    from users u where u.role = 'ambassador' and u.status = 'active' group by u.segment`;
  const seg = (k: Segment) => segRows.find((r) => r.segment === k) ?? { segment: k, total: 0, active14: 0 };
  const total = segRows.reduce((a, r) => a + r.total, 0);
  const active14 = segRows.reduce((a, r) => a + r.active14, 0);
  const internal = seg('office').total + seg('site').total;

  const [content] = await sql<{ approved: number; site: number; last30: number }[]>`
    select count(*)::int as approved,
      count(*) filter (where u.segment = 'site')::int as site,
      count(*) filter (where s.created_at > now() - interval '30 days')::int as last30
    from submissions s join users u on u.id = s.user_id
    where s.status = 'approved' and s.created_at >= ${start}`;

  const weeks = await sql<{ wk: string; internal: number; external: number }[]>`
    with weeks as (
      select generate_series(
        date_trunc('week', ${start}::timestamptz at time zone 'Europe/Moscow'),
        date_trunc('week', now() at time zone 'Europe/Moscow'),
        interval '1 week') as wk
    )
    select to_char(w.wk, 'YYYY-MM-DD') as wk,
      count(s.id) filter (where u.segment in ('office', 'site'))::int as internal,
      count(s.id) filter (where u.segment in ('uni', 'college'))::int as external
    from weeks w
    left join submissions s on s.status = 'approved' and date_trunc('week', s.created_at at time zone 'Europe/Moscow') = w.wk
    left join users u on u.id = s.user_id
    group by w.wk order by w.wk`;
  const lastWeeks = weeks.slice(-14);

  const [load] = await sql<{ captain: number; curator: number }[]>`
    select count(*) filter (where reviewer_role = 'captain')::int as captain, count(*) filter (where reviewer_role = 'curator')::int as curator
    from submissions where reviewed_at > now() - interval '30 days'`;

  const [m] = await sql<{ reach: number; interactions: number; careerVisits: number; applications: number; hires: number; referralCandidates: number; referralHires: number; internshipApplications: number; months: number }[]>`
    select coalesce(sum(reach), 0)::int as reach, coalesce(sum(interactions), 0)::int as interactions, coalesce(sum(career_visits), 0)::int as career_visits,
      coalesce(sum(applications), 0)::int as applications, coalesce(sum(hires), 0)::int as hires,
      coalesce(sum(referral_candidates), 0)::int as referral_candidates, coalesce(sum(referral_hires), 0)::int as referral_hires,
      coalesce(sum(internship_applications), 0)::int as internship_applications, count(*)::int as months
    from metrics where month >= ${season.months[0].key} and month <= ${season.months[8].key}`;

  const [att] = await sql<{ moderation: number; flagged: number; applications: number; redemptions: number; sleeping: number; noCaptain: number }[]>`
    select (select count(*)::int from submissions where status = 'pending') as moderation,
      (select count(*)::int from submissions where status = 'pending' and flagged) as flagged,
      (select count(*)::int from users where role = 'ambassador' and status = 'pending') as applications,
      (select count(*)::int from redemptions where status = 'requested') as redemptions,
      (select count(*)::int from users u where role = 'ambassador' and status = 'active'
         and coalesce((select max(created_at) from submissions s where s.user_id = u.id), u.approved_at, u.created_at) < now() - interval '14 days') as sleeping,
      (select count(*)::int from regions r where not exists (select 1 from users u where u.region_id = r.id and u.is_captain and u.status = 'active')) as no_captain`;

  // Сколько месяцев сезона прошло (для оценки «по плану»)
  const elapsed = Math.max(1, Math.min(9, season.monthsPassed + 1));
  const plan = (value: number, target: number): MetricRow['status'] => (value >= (target * elapsed) / 9 * 0.9 ? 'plan' : 'low');
  const activeShare = pct(active14, total);
  const perMonth = total ? content.last30 / total : 0;
  const er = m.reach ? (m.interactions / m.reach) * 100 : 0;
  const siteShare = pct(content.site, content.approved);
  const fmt1 = (n: number) => n.toFixed(1).replace('.', ',');

  const metrics: { group: string; rows: MetricRow[] }[] = [
    { group: 'Вовлечённость амбассадоров', rows: [
      { name: 'Доля активных за 14 дней', now: `${activeShare}%`, target: `≥ ${TARGETS.activeShare}%`, status: activeShare >= TARGETS.activeShare ? 'ok' : 'low' },
      { name: 'Принятых заданий на амбассадора за 30 дней', now: fmt1(perMonth), target: String(TARGETS.tasksPerMonth), status: perMonth >= TARGETS.tasksPerMonth ? 'ok' : 'low' },
      { name: 'Доля контента с АЗС и нефтебаз', now: `${siteShare}%`, target: `≥ ${TARGETS.siteShare}%`, status: siteShare >= TARGETS.siteShare ? 'ok' : 'low' },
    ] },
    { group: 'Охват и восприятие', rows: [
      { name: 'Охват публикаций за сезон', now: fmtCompact(m.reach), target: fmtCompact(TARGETS.reach), status: m.months ? plan(m.reach, TARGETS.reach) : 'later' },
      { name: 'Вовлечённость аудитории (ER)', now: m.reach ? `${fmt1(er)}%` : '—', target: `≥ ${TARGETS.er}%`, status: m.reach ? (er >= TARGETS.er ? 'ok' : 'low') : 'later' },
    ] },
    { group: 'Результат для найма', rows: [
      { name: 'Кандидаты по реферальной программе', now: String(m.referralCandidates), target: String(TARGETS.referralCandidates), status: m.months ? plan(m.referralCandidates, TARGETS.referralCandidates) : 'later' },
      { name: 'Наймы по рекомендациям', now: String(m.referralHires), target: String(TARGETS.referralHires), status: m.months ? plan(m.referralHires, TARGETS.referralHires) : 'later' },
      { name: 'Заявки на практику из вузов и колледжей с амбассадорами', now: String(m.internshipApplications), target: String(TARGETS.internshipApplications), status: m.months ? plan(m.internshipApplications, TARGETS.internshipApplications) : 'later' },
      { name: 'Практиканты, оставшиеся в компании', now: '—', target: '≥ 35%', status: 'later' },
    ] },
  ];

  return {
    season,
    total, internal, external: total - internal, active14, activeShare,
    segments: (['office', 'site', 'uni', 'college'] as Segment[]).map((k) => ({ key: k, total: seg(k).total, pct: pct(seg(k).active14, seg(k).total) })),
    content,
    weekLabels: lastWeeks.map((w) => fmtDateShort(new Date(`${w.wk}T12:00:00Z`))),
    weekInternal: lastWeeks.map((w) => w.internal),
    weekExternal: lastWeeks.map((w) => w.external),
    load,
    m,
    att,
    metrics,
  };
}

export const METRIC_STATUS: Record<MetricRow['status'], [string, string]> = {
  ok: ['good', 'в норме'],
  plan: ['brand', 'по плану'],
  low: ['warn', 'ниже цели'],
  later: ['', 'считаем позже'],
};
