import type { Metadata } from 'next';
import { requireAmbassador } from '@/lib/auth';
import { db } from '@/lib/db';
import { SEGMENTS, levelOf, type Segment } from '@/lib/domain';
import { fmtNum } from '@/lib/format';
import { PageHead } from '@/components/ui';

export const metadata: Metadata = { title: 'Рейтинг' };

type Person = { id: number; name: string; points: number; isCaptain: boolean; segment: Segment };

export default async function RatingPage() {
  const u = await requireAmbassador();
  const sql = db();
  const region = await sql<Person[]>`
    select id, name, points, is_captain, segment from users
    where role = 'ambassador' and status = 'active' and region_id = ${u.regionId}
    order by points desc, name`;
  const [rank] = await sql<{ above: number; total: number }[]>`
    select count(*) filter (where points > ${u.points})::int as above, count(*)::int as total
    from users where role = 'ambassador' and status = 'active'`;
  const cup = await sql<{ id: string; city: string; avg: number; n: number }[]>`
    select r.id, r.city, coalesce(round(avg(u.points)), 0)::int as avg, count(u.id)::int as n
    from regions r left join users u on u.region_id = r.id and u.role = 'ambassador' and u.status = 'active'
    group by r.id, r.city order by avg desc, r.sort`;
  const myIdx = region.findIndex((p) => p.id === u.id);
  const top = region.slice(0, 8);
  const showMe = myIdx >= 8;
  const max = Math.max(1, ...cup.map((c) => c.avg));

  return (
    <>
      <PageHead title="Рейтинг" eyebrow={u.regionName ?? 'Регион'} sub="Баллы за принятые задания и мероприятия сезона." />
      <div className="grid-main">
        <div className="stack">
          <div className="grid-2">
            <div className="card"><p className="label">Место в регионе</p><p className="rank-num">{myIdx + 1}<small> из {region.length}</small></p></div>
            <div className="card"><p className="label">Место в программе</p><p className="rank-num">{rank.above + 1}<small> из {rank.total}</small></p></div>
          </div>
          <section className="card">
            <p className="label">Топ региона</p>
            <ol className="lb">
              {top.map((p, i) => (
                <li key={p.id} className={p.id === u.id ? 'me' : ''}>
                  <span className="lb-n">{i + 1}</span>
                  <span className="lb-name">
                    {p.name}
                    {p.id === u.id ? <span className="chip brand">вы</span> : null}
                    {p.isCaptain ? <span className="chip accent">капитан</span> : null}
                    <span className="fine">{SEGMENTS[p.segment]?.label} · {levelOf(p.points).name}</span>
                  </span>
                  <span className="lb-p">{fmtNum(p.points)}</span>
                </li>
              ))}
              {showMe ? (
                <>
                  <li aria-hidden="true" style={{ display: 'block', textAlign: 'center', color: 'var(--muted)', padding: '2px 0' }}>···</li>
                  <li className="me">
                    <span className="lb-n">{myIdx + 1}</span>
                    <span className="lb-name">{u.name}<span className="chip brand">вы</span></span>
                    <span className="lb-p">{fmtNum(u.points)}</span>
                  </li>
                </>
              ) : null}
            </ol>
          </section>
        </div>
        <section className="card">
          <div className="between"><p className="label">Кубок регионов</p><span className="fine">средний балл на амбассадора</span></div>
          <ul className="cup">
            {cup.map((c, i) => (
              <li key={c.id} className={c.id === u.regionId ? 'me' : ''}>
                <span className="fine num">{i + 1}</span>
                <span>{c.city}</span>
                <span className="cup-bar"><span style={{ width: `${(c.avg / max) * 100}%` }} /></span>
                <span className="num" style={{ textAlign: 'right' }}>{c.avg}</span>
              </li>
            ))}
          </ul>
          <p className="fine">Считаем средний балл, а не сумму, чтобы небольшие регионы соревновались на равных с крупными. Кубок вручают на форуме в апреле.</p>
        </section>
      </div>
    </>
  );
}
