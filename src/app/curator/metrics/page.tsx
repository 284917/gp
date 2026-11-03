import type { Metadata } from 'next';
import Link from 'next/link';
import { requireCurator } from '@/lib/auth';
import { db } from '@/lib/db';
import { seasonInfo } from '@/lib/domain';
import { fmtNum } from '@/lib/format';
import { Alert, PageHead } from '@/components/ui';
import { SubmitButton } from '@/components/SubmitButton';
import { saveMetrics } from '@/app/actions/curator';

export const metadata: Metadata = { title: 'Метрики' };

type M = { month: string; reach: number; interactions: number; careerVisits: number; applications: number; hires: number; referralCandidates: number; referralHires: number; internshipApplications: number; isDemo: boolean };

const FIELDS: [keyof M, string, string][] = [
  ['reach', 'Охват публикаций', 'Сумма охватов постов с #ГолосКомпании'],
  ['interactions', 'Реакции и комментарии', 'Лайки, комментарии, репосты'],
  ['careerVisits', 'Переходы на страницы карьеры', 'По UTM-меткам в ссылках амбассадоров'],
  ['applications', 'Отклики и заявки', 'Из системы подбора по источнику'],
  ['hires', 'Приняты на работу или практику', 'Из системы подбора'],
  ['referralCandidates', 'Кандидаты по рекомендациям', 'Реферальная программа'],
  ['referralHires', 'Наймы по рекомендациям', 'Реферальная программа'],
  ['internshipApplications', 'Заявки на практику', 'От студентов вузов и колледжей с амбассадорами'],
];

export default async function MetricsPage({ searchParams }: { searchParams: Promise<{ month?: string; ok?: string }> }) {
  await requireCurator();
  const sp = await searchParams;
  const season = seasonInfo();
  const months = season.months.filter((m) => m.key <= season.currentKey);
  const rows = await db()<M[]>`select month, reach, interactions, career_visits, applications, hires, referral_candidates, referral_hires, internship_applications, is_demo
                               from metrics where month >= ${season.months[0].key} order by month`;
  const selected = months.find((m) => m.key === sp.month)?.key ?? months[Math.max(0, months.length - 2)]?.key ?? season.currentKey;
  const cur = rows.find((r) => r.month === selected);
  const label = (key: string) => season.months.find((m) => m.key === key)?.label ?? key;

  return (
    <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
      <PageHead title="Метрики" eyebrow="Внешние данные"
        sub="Охват, отклики и наймы живут в соцсетях и системе подбора. Раз в месяц внесите их сюда — обзор и цели сезона пересчитаются сами." />
      {sp.ok ? <Alert tone="good">Данные за {label(sp.ok)} сохранены.</Alert> : null}
      {rows.some((r) => r.isDemo) ? (
        <Alert tone="info"><b>Демонстрационные метрики.</b> Месяцы с пометкой «ДЕМО» заполнены модельными значениями для кейс-чемпионата, а не подтверждёнными данными компании.</Alert>
      ) : null}
      <div className="grid-main">
        <section className="card" style={{ padding: 8 }}>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Месяц</th><th>Источник</th><th>Охват</th><th>Реакции</th><th>Переходы</th><th>Отклики</th><th>Наймы</th><th>Рекомендации</th><th>Практика</th></tr></thead>
              <tbody>
                {rows.length ? rows.map((r) => (
                  <tr key={r.month}>
                    <td className="nowrap"><Link className="rowlink" href={`/curator/metrics?month=${r.month}`}>{label(r.month)}</Link></td>
                    <td>{r.isDemo ? <span className="chip brand">ДЕМО</span> : <span className="fine">Фактические</span>}</td>
                    <td className="n">{fmtNum(r.reach)}</td>
                    <td className="n">{fmtNum(r.interactions)}</td>
                    <td className="n">{fmtNum(r.careerVisits)}</td>
                    <td className="n">{fmtNum(r.applications)}</td>
                    <td className="n">{fmtNum(r.hires)}</td>
                    <td className="n">{r.referralCandidates} / {r.referralHires}</td>
                    <td className="n">{r.internshipApplications}</td>
                  </tr>
                )) : <tr><td colSpan={9} className="sub">Данных за сезон пока нет.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <form action={saveMetrics} className="card form" key={selected}>
          <div className="field-wrap">
            <label className="flabel" htmlFor="m-month">Месяц</label>
            <select id="m-month" name="month" className="field" defaultValue={selected}>
              {months.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
            <span className="fhint">Чтобы исправить месяц, выберите его в таблице.</span>
          </div>
          {FIELDS.map(([k, l, h]) => (
            <div key={k} className="field-wrap">
              <label className="flabel" htmlFor={`m-${k}`}>{l}</label>
              <input id={`m-${k}`} name={k} type="number" min={0} inputMode="numeric" className="field" defaultValue={cur ? Number(cur[k]) : 0} />
              <span className="fhint">{h}</span>
            </div>
          ))}
          {cur?.isDemo ? (
            <Alert tone="warn">Вы редактируете модельные значения. После ручного сохранения месяц будет обозначен как фактический. Вводите здесь только подтверждённые данные.</Alert>
          ) : null}
          <div><SubmitButton>Сохранить</SubmitButton></div>
        </form>
      </div>
    </div>
  );
}
