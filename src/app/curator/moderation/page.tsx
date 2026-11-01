import type { Metadata } from 'next';
import Link from 'next/link';
import { requireCurator } from '@/lib/auth';
import { db } from '@/lib/db';
import { segmentsOf, type Group } from '@/lib/domain';
import { fmtDateTime } from '@/lib/format';
import { Empty, PageHead, SubmissionChip } from '@/components/ui';
import { ReviewCard, type ReviewItem } from '@/components/ReviewCard';

export const metadata: Metadata = { title: 'Модерация' };

const FILTERS = [
  ['all', 'Все'],
  ['flagged', 'Для куратора'],
  ['internal', 'Сотрудники'],
  ['external', 'Студенты'],
] as const;

export default async function ModerationPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const c = await requireCurator();
  const sp = await searchParams;
  const def = c.curatorScope === 'internal' || c.curatorScope === 'external' ? c.curatorScope : 'all';
  const f = FILTERS.some(([k]) => k === sp.f) ? sp.f! : def;
  const sql = db();
  const where = f === 'flagged' ? sql`and s.flagged`
    : f === 'internal' || f === 'external' ? sql`and a.segment = any(${sql.array(segmentsOf(f as Group))})`
    : sql``;
  const items = await sql<ReviewItem[]>`
    select s.id, a.name as user_name, a.segment, r.city, t.title, t.kind, t.points, s.body, s.link, s.file_url, s.file_name, s.flagged, s.created_at,
      (select name from users c where c.region_id = a.region_id and c.is_captain and c.status = 'active' and c.id <> a.id limit 1) as captain_name
    from submissions s join users a on a.id = s.user_id join tasks t on t.id = s.task_id left join regions r on r.id = a.region_id
    where s.status = 'pending' ${where}
    order by s.flagged desc, s.created_at`;
  const recent = await sql<{ id: number; userName: string; title: string; status: 'approved' | 'returned'; reviewerName: string | null; reviewerRole: string | null; reviewedAt: Date }[]>`
    select s.id, a.name as user_name, t.title, s.status, r.name as reviewer_name, s.reviewer_role, s.reviewed_at
    from submissions s join users a on a.id = s.user_id join tasks t on t.id = s.task_id left join users r on r.id = s.reviewer_id
    where s.reviewed_at is not null order by s.reviewed_at desc limit 12`;

  return (
    <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
      <PageHead title="Модерация" eyebrow="Проверка заданий"
        sub="Капитаны проверяют задания своих регионов. Куратору остаются съёмка на объектах, внешние публикации и регионы без капитана — но принять можно любое задание." />
      <nav className="tabs" aria-label="Фильтр">
        {FILTERS.map(([k, l]) => <Link key={k} href={`/curator/moderation?f=${k}`} aria-current={f === k ? 'page' : undefined}>{l}</Link>)}
      </nav>
      {items.length ? <div className="mod-list">{items.map((s) => <ReviewCard key={s.id} s={s} showRoute />)}</div>
        : <Empty icon="check" title="Очередь пуста">Новые задания появятся здесь, как только амбассадоры их сдадут.</Empty>}
      {recent.length ? (
        <section className="card">
          <p className="label">Недавно проверено</p>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Амбассадор</th><th>Задание</th><th>Проверил</th><th>Когда</th><th>Итог</th></tr></thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id}>
                    <td className="nowrap">{r.userName}</td>
                    <td>{r.title}</td>
                    <td className="nowrap">{r.reviewerName ?? '—'} <span className="fine">{r.reviewerRole === 'captain' ? 'капитан' : 'куратор'}</span></td>
                    <td className="n">{fmtDateTime(r.reviewedAt)}</td>
                    <td><SubmissionChip status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
