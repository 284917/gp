import type { Metadata } from 'next';
import Link from 'next/link';
import { requireCurator } from '@/lib/auth';
import { db } from '@/lib/db';
import { pct, tzLabel } from '@/lib/format';
import { PageHead } from '@/components/ui';
import { RegionMap, type MapRegion } from '@/components/charts';

export const metadata: Metadata = { title: 'Регионы' };

type Row = { id: string; city: string; name: string; lon: number; lat: number; tz: number; internal: number; external: number; active14: number; avg: number; captain: string | null; captainId: number | null };

export default async function RegionsPage() {
  await requireCurator();
  const rows = await db()<Row[]>`
    select r.id, r.city, r.name, r.lon, r.lat, r.tz,
      count(u.id) filter (where u.segment in ('office', 'site'))::int as internal,
      count(u.id) filter (where u.segment in ('uni', 'college'))::int as external,
      count(u.id) filter (where exists (select 1 from submissions s where s.user_id = u.id and s.created_at > now() - interval '14 days'))::int as active14,
      coalesce(round(avg(u.points)), 0)::int as avg,
      (select c.name from users c where c.region_id = r.id and c.is_captain and c.status = 'active' order by c.points desc limit 1) as captain,
      (select c.id from users c where c.region_id = r.id and c.is_captain and c.status = 'active' order by c.points desc limit 1) as captain_id
    from regions r left join users u on u.region_id = r.id and u.role = 'ambassador' and u.status = 'active'
    group by r.id order by r.sort`;
  const map: MapRegion[] = rows.map((r) => ({ id: r.id, city: r.city, lon: r.lon, lat: r.lat, tz: r.tz, total: r.internal + r.external, activePct: pct(r.active14, r.internal + r.external), hasCaptain: Boolean(r.captain) }));
  const weak = map.filter((r) => r.total && (r.activePct < 50 || !r.hasCaptain)).map((r) => r.city);
  const farTz = Math.max(...rows.map((r) => r.tz));
  const status = (r: MapRegion) => !r.hasCaptain ? <span className="chip bad">нужен капитан</span>
    : r.activePct < 50 ? <span className="chip bad">нужен выезд</span>
    : r.activePct < 70 ? <span className="chip warn">под наблюдением</span>
    : <span className="chip good">в норме</span>;

  return (
    <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
      <PageHead title="Регионы" eyebrow="Региональная модель" sub="Кураторы работают из Санкт-Петербурга, в регионах программу ведут капитаны." />
      <section className="card">
        <div className="between"><h2 className="h3">Карта программы</h2><span className="fine">схема без точных границ</span></div>
        <div className="chart-wrap"><RegionMap regions={map} /></div>
        <div className="legend">
          <span><i className="dot good" />активны 70% и больше</span>
          <span><i className="dot warn" />50–69%</span>
          <span><i className="dot bad" />меньше 50%</span>
          <span>пунктир — нет капитана · число — амбассадоров</span>
        </div>
      </section>
      <div className="grid-3">
        <section className="card"><h3 className="h3">Капитан в каждом регионе</h3><p className="sub">Амбассадор уровня «Лидер» проверяет задания, ведёт чат региона и раз в две недели созванивается с куратором. Капитаны есть в {map.filter((r) => r.hasCaptain).length} регионах из {map.length}.</p></section>
        <section className="card"><h3 className="h3">Созвоны с учётом поясов</h3><p className="sub">10:00 в Санкт-Петербурге — уже {10 + farTz}:00 в самых восточных регионах ({tzLabel(farTz)}). Общие эфиры ставим на 10–12 по Москве, записи остаются в канале амбассадоров.</p></section>
        <section className="card"><h3 className="h3">Выезд куратора раз в сезон</h3><p className="sub">{weak.length ? `В первую очередь — туда, где активность ниже 50% или нет капитана: ${weak.join(', ')}.` : 'Сейчас все регионы в норме — выезды можно планировать на фестиваль в апреле.'} Остальным — онлайн-форматы.</p></section>
      </div>
      <section className="card" style={{ padding: 8 }}>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Регион</th><th>Капитан</th><th>Сотрудники</th><th>Студенты</th><th>Активны</th><th>Средний балл</th><th>Время</th><th>Статус</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id}>
                  <td className="nowrap"><Link className="rowlink" href={`/curator/ambassadors?region=${r.id}`}>{r.city}</Link></td>
                  <td className="nowrap">{r.captainId ? <Link className="link" href={`/curator/ambassadors/${r.captainId}`}>{r.captain}</Link> : <span className="fine">не назначен</span>}</td>
                  <td className="n">{r.internal}</td>
                  <td className="n">{r.external}</td>
                  <td className="n">{map[i].activePct}%</td>
                  <td className="n">{r.avg}</td>
                  <td className="n">{tzLabel(r.tz)}</td>
                  <td>{status(map[i])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
