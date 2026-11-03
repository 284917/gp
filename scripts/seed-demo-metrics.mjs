#!/usr/bin/env node
/**
 * Создание безопасного демонстрационного набора внешних KPI для сезона 2026/27.
 * Использование:
 *   node scripts/seed-demo-metrics.mjs --plan
 *   $env:DEMO_METRICS_ACK = 'YES'
 *   node scripts/seed-demo-metrics.mjs --apply
 * 
 * Важное: только сентябрь и октябрь 2026, без замены существующих месяцев.
 * Модельные значения, не факты Газпром нефти. Метка is_demo=true.
 */
const METRICS = [
  { month: '2026-09', reach: 110000, interactions: 5600, careerVisits: 690,
    applications: 46, hires: 5, referralCandidates: 10, referralHires: 2,
    internshipApplications: 24 },
  { month: '2026-10', reach: 215000, interactions: 11400, careerVisits: 1420,
    applications: 112, hires: 13, referralCandidates: 22, referralHires: 6,
    internshipApplications: 44 },
];
const args = process.argv.slice(2);
if (args.some((a) => !['--plan', '--apply'].includes(a)) || (args.includes('--plan') && args.includes('--apply'))) {
  console.error('Укажите --plan или --apply.');
  process.exit(1);
}
const apply = args.includes('--apply');
console.log(`Режим: ${apply ? 'APPLY' : 'PLAN'}. Демонстрационные внешние KPI 2026/27.`);
console.table(METRICS);
if (!apply) {
  console.log('Только предварительный просмотр; подключения к базе не было.');
  process.exit(0);
}
if (process.env.DEMO_METRICS_ACK !== 'YES') {
  console.error('Для записи задайте DEMO_METRICS_ACK=YES в этом PowerShell.');
  process.exit(1);
}
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error('DATABASE_URL не задан в текущем PowerShell.');
  process.exit(1);
}
let host;
try { host = new URL(url).hostname; } catch {
  console.error('Неверный формат DATABASE_URL.'); process.exit(1);
}
if (!host.endsWith('.neon.tech')) {
  console.error('Подключение не похоже на Neon; выполнение отменено.'); process.exit(1);
}
const { default: postgres } = await import('postgres');
const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 15, idle_timeout: 10 });
try {
  const result = await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(18480123)`;
    // Перед обновлением схемы убеждаемся, что это та БД, где уже есть наш демонабор.
    const [check] = await tx`
      select count(*)::int as n from users
      where is_demo = true and email like 'seed%@demo.golos.test'`;
    if (check.n < 90) {
      throw new Error(`Найдено только ${check.n} демоаккаунтов; ожидаем не меньше 90. Запись отменена.`);
    }
    const existing = await tx`
      select month from metrics where month in ('2026-09', '2026-10') order by month`;
    if (existing.length) {
      throw new Error(`Метрики уже есть за: ${existing.map((x) => x.month).join(', ')}. Ничего не перезаписано.`);
    }
    // Та же совместимая миграция, что в migrations/004_metrics_demo_flag.sql.
    await tx`alter table metrics add column if not exists is_demo boolean not null default false`;
    let created = 0;
    for (const m of METRICS) {
      await tx`
        insert into metrics
          (month, reach, interactions, career_visits, applications, hires,
           referral_candidates, referral_hires, internship_applications, is_demo)
        values
          (${m.month}, ${m.reach}, ${m.interactions}, ${m.careerVisits}, ${m.applications}, ${m.hires},
           ${m.referralCandidates}, ${m.referralHires}, ${m.internshipApplications}, true)
        on conflict (month) do nothing`;
      created++;
    }
    return { created, demoAccounts: check.n };
  });
  console.log('УСПЕШНО. Добавлено месяцев:', result.created,
    '· демонстрационных аккаунтов найдено:', result.demoAccounts);
  console.log('Метрики помечены is_demo=true. Существующие пользователи и задания не изменены.');
} catch (error) {
  console.error('ОШИБКА:', error.message || error.code || 'неизвестная');
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
