import type { Metadata } from 'next';
import { requireCurator } from '@/lib/auth';
import { db } from '@/lib/db';
import { SEGMENTS, type Segment } from '@/lib/domain';
import { fmtDate, timeAgo } from '@/lib/format';
import { Avatar, Empty, PageHead } from '@/components/ui';
import { SubmitButton } from '@/components/SubmitButton';
import { approveApplication, rejectApplication } from '@/app/actions/curator';

export const metadata: Metadata = { title: 'Заявки' };

type App = { id: number; name: string; email: string; phone: string | null; segment: Segment; city: string | null; org: string | null; position: string | null; motivation: string | null; createdAt: Date };

export default async function ApplicationsPage() {
  await requireCurator();
  const sql = db();
  const apps = await sql<App[]>`
    select u.id, u.name, u.email, u.phone, u.segment, r.city, u.org, u.position, u.motivation, u.created_at
    from users u left join regions r on r.id = u.region_id
    where u.role = 'ambassador' and u.status = 'pending' order by u.created_at`;
  const recent = await sql<{ id: number; name: string; segment: Segment; status: string; approvedAt: Date | null; createdAt: Date }[]>`
    select id, name, segment, status, approved_at, created_at from users
    where role = 'ambassador' and status in ('active', 'rejected') and created_at > now() - interval '60 days'
    order by coalesce(approved_at, created_at) desc limit 10`;
  return (
    <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
      <PageHead title="Заявки в программу" eyebrow="Привлечение" sub="Новые амбассадоры попадают в программу после одобрения куратором. После одобрения им откроются задания и придёт уведомление." />
      {apps.length ? (
        <div className="mod-list">
          {apps.map((a) => (
            <article key={a.id} className="mod">
              <div className="mod-top">
                <Avatar name={a.name} className="soft sm" />
                <div className="mod-who"><b>{a.name}</b><span>{SEGMENTS[a.segment]?.long} · {a.city} · {timeAgo(a.createdAt)}</span></div>
              </div>
              <p style={{ fontSize: 14 }}><b style={{ fontWeight: 600 }}>{a.org}</b>{a.position ? `, ${a.position}` : ''}</p>
              {a.motivation ? <p className="text-pre" style={{ fontSize: 14, color: 'var(--muted)' }}>«{a.motivation}»</p> : null}
              <p className="fine">{a.email}{a.phone ? ` · ${a.phone}` : ''}</p>
              <div className="btns">
                <form action={approveApplication}><input type="hidden" name="id" value={a.id} /><SubmitButton className="btn primary small" pendingText="Принимаю…">Принять в программу</SubmitButton></form>
                <form action={rejectApplication}><input type="hidden" name="id" value={a.id} /><SubmitButton className="btn small danger" pendingText="…">Отклонить</SubmitButton></form>
              </div>
            </article>
          ))}
        </div>
      ) : <Empty icon="inbox" title="Новых заявок нет">Ссылку на заявку можно разместить в карьерных каналах и на площадках вузов: /join</Empty>}
      {recent.length ? (
        <section className="card">
          <p className="label">Решения за 60 дней</p>
          <ul className="list">
            {recent.map((r) => (
              <li key={r.id} className="between">
                <span>{r.name} <span className="fine">· {SEGMENTS[r.segment]?.label}</span></span>
                <span className={`chip ${r.status === 'active' ? 'good' : 'bad'}`}>{r.status === 'active' ? `принят ${r.approvedAt ? fmtDate(r.approvedAt) : ''}` : 'отклонён'}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
