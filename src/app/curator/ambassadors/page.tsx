import type { Metadata } from 'next';
import Link from 'next/link';
import { requireCurator } from '@/lib/auth';
import { db } from '@/lib/db';
import { SEGMENTS, levelOf, segmentsOf, type Segment } from '@/lib/domain';
import { daysSince, fmtNum, timeAgo } from '@/lib/format';
import { Empty, PageHead } from '@/components/ui';
import { Icon } from '@/components/Icon';

export const metadata: Metadata = { title: 'Амбассадоры' };

type Row = { id: number; name: string; segment: Segment; city: string | null; points: number; isCaptain: boolean; status: string; lastSub: Date | null; approvedAt: Date | null; approved: number; pending: number; iniJoined: number; iniAuthored: number };

export default async function AmbassadorsPage({ searchParams }: { searchParams: Promise<{ q?: string; group?: string; region?: string; filter?: string }> }) {
  await requireCurator();
  const sp = await searchParams;
  const sql = db();
  const regions = await sql<{ id: string; city: string }[]>`select id, city from regions order by sort`;
  const q = (sp.q ?? '').trim();
  const group = sp.group === 'internal' || sp.group === 'external' ? sp.group : '';
  const region = regions.some((r) => r.id === sp.region) ? sp.region! : '';
  const filter = sp.filter === 'sleeping' || sp.filter === 'captains' || sp.filter === 'paused' ? sp.filter : '';

  const rows = await sql<Row[]>`
    select u.id, u.name, u.segment, r.city, u.points, u.is_captain, u.status, u.approved_at,
      (select max(created_at) from submissions s where s.user_id = u.id) as last_sub,
      (select count(*)::int from submissions s where s.user_id = u.id and s.status = 'approved') as approved,
      (select count(*)::int from submissions s where s.user_id = u.id and s.status = 'pending') as pending,
      (select count(*)::int from initiatives i where i.status = 'done' and (i.author_id = u.id or exists (select 1 from initiative_members im where im.initiative_id = i.id and im.user_id = u.id and im.status = 'accepted'))) as ini_joined,
      (select count(*)::int from initiatives i where i.status = 'done' and i.author_id = u.id) as ini_authored
    from users u left join regions r on r.id = u.region_id
    where u.role = 'ambassador' and u.status in ('active', 'paused')
      ${q ? sql`and (u.name ilike ${'%' + q + '%'} or u.email ilike ${'%' + q + '%'} or u.org ilike ${'%' + q + '%'})` : sql``}
      ${group ? sql`and u.segment = any(${sql.array(segmentsOf(group))})` : sql``}
      ${region ? sql`and u.region_id = ${region}` : sql``}
      ${filter === 'captains' ? sql`and u.is_captain` : sql``}
      ${filter === 'paused' ? sql`and u.status = 'paused'` : sql``}
    order by u.points desc, u.name`;
  const list = filter === 'sleeping'
    ? rows.filter((r) => r.status === 'active' && (daysSince(r.lastSub ?? r.approvedAt) ?? 99) >= 14)
    : rows;

  const status = (r: Row) => {
    if (r.status === 'paused') return <span className="chip">на паузе</span>;
    const d = daysSince(r.lastSub ?? r.approvedAt) ?? 99;
    if (d >= 14) return <span className="chip bad">молчит {d} дн.</span>;
    if (d >= 8) return <span className="chip warn">нет заданий {d} дн.</span>;
    return <span className="chip good">активен</span>;
  };

  return (
    <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
      <PageHead title="Амбассадоры" eyebrow="Участники программы" sub={`Найдено: ${list.length}`} />
      <form className="filters" action="/curator/ambassadors">
        <input className="field" name="q" defaultValue={q} placeholder="Имя, почта или место работы" aria-label="Поиск" />
        <select className="field" name="group" defaultValue={group} aria-label="Сегмент">
          <option value="">Все сегменты</option>
          <option value="internal">Сотрудники</option>
          <option value="external">Студенты</option>
        </select>
        <select className="field" name="region" defaultValue={region} aria-label="Регион">
          <option value="">Все регионы</option>
          {regions.map((r) => <option key={r.id} value={r.id}>{r.city}</option>)}
        </select>
        <select className="field" name="filter" defaultValue={filter} aria-label="Статус">
          <option value="">Любой статус</option>
          <option value="sleeping">Молчат 14+ дней</option>
          <option value="captains">Капитаны</option>
          <option value="paused">На паузе</option>
        </select>
        <button className="btn" type="submit"><Icon name="search" size={16} /> Показать</button>
      </form>
      {list.length ? (
        <section className="card" style={{ padding: 8 }}>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Амбассадор</th><th>Роль</th><th>Регион</th><th>Уровень</th><th>Баллы</th><th>Задания</th><th>Последнее задание</th><th>Статус</th></tr></thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.id}>
                    <td className="nowrap"><Link className="rowlink" href={`/curator/ambassadors/${r.id}`}>{r.name}</Link>{r.isCaptain ? <> <span className="chip accent">капитан</span></> : null}</td>
                    <td className="nowrap">{SEGMENTS[r.segment]?.label}</td>
                    <td className="nowrap">{r.city}</td>
                    <td>{levelOf(r.points, r).name}</td>
                    <td className="n">{fmtNum(r.points)}</td>
                    <td className="n">{r.approved}{r.pending ? <span className="fine"> +{r.pending}</span> : null}</td>
                    <td className="n">{r.lastSub ? timeAgo(r.lastSub) : '—'}</td>
                    <td>{status(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : <Empty icon="users" title="Никого не нашли">Измените фильтры или поиск.</Empty>}
    </div>
  );
}
