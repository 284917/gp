import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAmbassador } from '@/lib/auth';
import { db } from '@/lib/db';
import { KINDS, seasonInfo, type Kind, type SubmissionStatus } from '@/lib/domain';
import { Empty, KindIcon, PageHead, SubmissionChip } from '@/components/ui';
import { Icon } from '@/components/Icon';

export const metadata: Metadata = { title: 'Задания' };

type Row = { id: number; title: string; kind: Kind; points: number; duration: string; joint: boolean; needsCurator: boolean; myStatus: SubmissionStatus | null };

function TaskRow({ t }: { t: Row }) {
  return (
    <Link href={`/me/tasks/${t.id}`} className="task">
      <KindIcon kind={t.kind} />
      <span className="task-body">
        <span className="task-title">{t.title}</span>
        <span className="meta">
          <Icon name="clock" size={14} /> {t.duration} · {KINDS[t.kind].label}
          {t.joint ? ' · с тандемом' : ''}
          {t.needsCurator ? ' · проверяет куратор' : ''}
        </span>
      </span>
      {t.myStatus ? <SubmissionChip status={t.myStatus} /> : <span className="pts">+{t.points}</span>}
    </Link>
  );
}

export default async function TasksPage() {
  const u = await requireAmbassador();
  const rows = await db()<Row[]>`
    select t.id, t.title, t.kind, t.points, t.duration, t.joint, t.needs_curator, s.status as my_status
    from tasks t
    left join lateral (select status from submissions where user_id = ${u.id} and task_id = t.id order by created_at desc limit 1) s on true
    where t.active and ${u.segment} = any(t.segments)
    order by t.sort, t.id`;
  const todo = rows.filter((r) => !r.myStatus || r.myStatus === 'returned');
  const review = rows.filter((r) => r.myStatus === 'pending');
  const done = rows.filter((r) => r.myStatus === 'approved');
  const s = seasonInfo();
  return (
    <>
      <PageHead title="Задания" eyebrow="Задания недели" sub={`${s.current?.now ?? 'Межсезонье'}. Новые задания появляются по понедельникам.`} />
      <div className="stack" style={{ '--gap': '24px' } as React.CSSProperties}>
        <section className="stack" style={{ '--gap': '10px' } as React.CSSProperties}>
          <div className="between"><h2 className="h3">К выполнению</h2><span className="chip">{todo.length}</span></div>
          {todo.length ? <div className="tgroups">{todo.map((t) => <TaskRow key={t.id} t={t} />)}</div> : <Empty icon="check" title="Все задания сданы">Новые задания появятся в понедельник.</Empty>}
        </section>
        {review.length ? (
          <section className="stack" style={{ '--gap': '10px' } as React.CSSProperties}>
            <div className="between"><h2 className="h3">На проверке</h2><span className="chip warn">{review.length}</span></div>
            <div className="tgroups">{review.map((t) => <TaskRow key={t.id} t={t} />)}</div>
          </section>
        ) : null}
        {done.length ? (
          <section className="stack" style={{ '--gap': '10px' } as React.CSSProperties}>
            <div className="between"><h2 className="h3">Выполнено</h2><span className="chip good">{done.length}</span></div>
            <div className="tgroups">{done.map((t) => <TaskRow key={t.id} t={t} />)}</div>
          </section>
        ) : null}
        <p className="fine">Задания проверяет капитан вашего региона. Съёмку на объектах и внешние публикации дополнительно смотрит куратор программы.</p>
      </div>
    </>
  );
}
