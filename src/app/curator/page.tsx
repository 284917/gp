import type { Metadata } from 'next';
import Link from 'next/link';
import { requireCurator } from '@/lib/auth';
import { getProgramStats, METRIC_STATUS } from '@/lib/stats';
import { SEGMENTS, TARGETS } from '@/lib/domain';
import { fmtCompact, fmtNum, pct } from '@/lib/format';
import { PageHead } from '@/components/ui';
import { LineChart } from '@/components/charts';

export const metadata: Metadata = { title: 'Обзор программы' };

export default async function CuratorOverview() {
  const c = await requireCurator();
  const s = await getProgramStats();
  const reviews = s.load.captain + s.load.curator;
  const capShare = pct(s.load.captain, reviews);
  const funnel: [string, number][] = [
    ['Охват публикаций', s.m.reach],
    ['Реакции и комментарии', s.m.interactions],
    ['Переходы на страницы карьеры', s.m.careerVisits],
    ['Отклики и заявки', s.m.applications],
    ['Приняты на работу или практику', s.m.hires],
  ];

  return (
    <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
      <PageHead title="Обзор программы" eyebrow={`Сезон ${s.season.label} · ${s.season.current?.now ?? 'межсезонье'}`}
        sub={`Здравствуйте, ${c.name.split(' ')[0]}. Вот что происходит в программе сейчас.`} />

      <div className="attention">
        <Link href="/curator/moderation" className={s.att.moderation ? '' : 'calm'}><b>{s.att.moderation}</b><span>на проверке{s.att.flagged ? `, из них ${s.att.flagged} для куратора` : ''}</span></Link>
        <Link href="/curator/applications" className={s.att.applications ? '' : 'calm'}><b>{s.att.applications}</b><span>новых заявок в программу</span></Link>
        <Link href="/curator/rewards" className={s.att.redemptions ? '' : 'calm'}><b>{s.att.redemptions}</b><span>наград ждут выдачи</span></Link>
        <Link href="/curator/ambassadors?filter=sleeping" className={s.att.sleeping ? '' : 'calm'}><b>{s.att.sleeping}</b><span>амбассадоров молчат 14+ дней</span></Link>
      </div>

      <div className="kpis">
        <div className="kpi"><p className="label">Амбассадоров</p><p className="kpi-v">{s.total}</p><p className="kpi-s">{s.internal} сотрудников · {s.external} студентов</p></div>
        <div className="kpi"><p className="label">Активны за 14 дней</p><p className="kpi-v">{s.activeShare}%</p><p className="kpi-s"><span className={`chip ${s.activeShare >= TARGETS.activeShare ? 'good' : 'warn'}`}>цель {TARGETS.activeShare}%</span></p></div>
        <div className="kpi"><p className="label">Единиц контента</p><p className="kpi-v">{fmtNum(s.content.approved)}</p><p className="kpi-s">принято с начала сезона</p></div>
        <div className="kpi"><p className="label">Охват публикаций</p><p className="kpi-v">{fmtCompact(s.m.reach)}</p><p className="kpi-s"><span className="chip brand">план {fmtCompact(TARGETS.reach)}</span></p></div>
        <div className="kpi"><p className="label">Кандидаты по рекомендациям</p><p className="kpi-v">{s.m.referralCandidates}</p><p className="kpi-s">{s.m.referralHires} приняты на работу</p></div>
        <div className="kpi"><p className="label">Заявки на практику</p><p className="kpi-v">{s.m.internshipApplications}</p><p className="kpi-s">из вузов и колледжей с амбассадорами</p></div>
      </div>

      <div className="grid-main">
        <section className="card">
          <div className="between">
            <h2 className="h3">Контент по неделям</h2>
            <div className="legend">
              <span><i className="lg-s0" />Сотрудники</span>
              <span><i className="lg-s1" />Студенты</span>
            </div>
          </div>
          <div className="chart-wrap">
            <LineChart labels={s.weekLabels} ariaLabel="Принятые задания по неделям у сотрудников и студентов"
              series={[{ name: 'Сотрудники', values: s.weekInternal }, { name: 'Студенты', values: s.weekExternal }]} />
          </div>
          <p className="fine">Принятые задания: посты, фото, видео, отчёты о встречах. Неделя начинается в понедельник по Москве.</p>
        </section>
        <section className="card">
          <h2 className="h3">Нагрузка кураторов</h2>
          <div className="row" style={{ alignItems: 'baseline' }}><span className="kpi-v">{reviews}</span><span className="sub">проверок за 30 дней</span></div>
          {reviews ? (
            <div className="stackbar" role="img" aria-label={`Капитаны: ${s.load.captain}, кураторы: ${s.load.curator}`}>
              {s.load.captain ? <span className="a" style={{ width: `${capShare}%` }}>Капитаны · {s.load.captain}</span> : null}
              {s.load.curator ? <span className="b" style={{ width: `${100 - capShare}%` }}>Кураторы · {s.load.curator}</span> : null}
            </div>
          ) : null}
          <ul className="list" style={{ fontSize: 14 }}>
            <li><b style={{ fontWeight: 600 }}>Без капитанов</b><br /><span className="sub">{Math.round(s.total / 4)} амбассадоров и {Math.round(reviews / 4)} проверок в месяц на каждого из четырёх кураторов.</span></li>
            <li><b style={{ fontWeight: 600 }}>С капитанами</b><br /><span className="sub">{Math.round(s.load.curator / 4)} проверок на куратора. Капитаны закрывают {capShare}% работы{s.att.noCaptain ? `, капитан нужен ещё в ${s.att.noCaptain} регионе` : ''}.</span></li>
          </ul>
        </section>
      </div>

      <div className="grid-2">
        <section className="card">
          <h2 className="h3">Активность по сегментам</h2>
          <ul className="segbars">
            {s.segments.map((g) => (
              <li key={g.key}>
                <span className="sb-name">{SEGMENTS[g.key].label}<small>{g.total} чел.</small></span>
                <span className="sb-track"><span className={`sb-fill ${g.pct < TARGETS.activeShare ? 'warn' : ''}`} style={{ width: `${g.pct}%` }} /><span className="sb-target" style={{ left: `${TARGETS.activeShare}%` }} /></span>
                <span className="sb-v">{g.pct}%</span>
              </li>
            ))}
          </ul>
          <p className="fine">Доля амбассадоров, сдавших задание за последние 14 дней. Чёрная линия — цель {TARGETS.activeShare}%.</p>
        </section>
        <section className="card">
          <div className="between"><h2 className="h3">От публикации до найма</h2><Link className="link" style={{ fontSize: 13 }} href="/curator/metrics">Внести данные</Link></div>
          <ul className="funnel">
            {funnel.map(([name, v], i) => (
              <li key={name}>
                <span>{name}</span>
                <span className="v">{fmtNum(v)}</span>
                {i && funnel[i - 1][1] ? <span className="c">конверсия из предыдущего шага {((v / funnel[i - 1][1]) * 100).toFixed(1).replace('.', ',')}%</span> : null}
              </li>
            ))}
          </ul>
          <p className="fine">Охват и отклики кураторы вносят раз в месяц из соцсетей и системы подбора.</p>
        </section>
      </div>

      <section className="card">
        <div className="between"><h2 className="h3">Метрики программы</h2><span className="fine">прошло {Math.min(9, s.season.monthsPassed + 1)} из 9 месяцев сезона</span></div>
        <p className="sub">Три уровня: сначала видно вовлечённость амбассадоров, потом охват, в конце — результат для найма.</p>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Метрика</th><th>Сейчас</th><th>Цель сезона</th><th>Статус</th></tr></thead>
            <tbody>
              {s.metrics.map((g) => [
                <tr key={g.group} className="grp"><td colSpan={4}>{g.group}</td></tr>,
                ...g.rows.map((r) => (
                  <tr key={r.name}>
                    <td>{r.name}</td>
                    <td className="n"><b>{r.now}</b></td>
                    <td className="n">{r.target}</td>
                    <td><span className={`chip ${METRIC_STATUS[r.status][0]}`}>{METRIC_STATUS[r.status][1]}</span></td>
                  </tr>
                )),
              ])}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
