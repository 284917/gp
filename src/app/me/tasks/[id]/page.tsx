import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { blobEnabled, requireAmbassador } from '@/lib/auth';
import { db } from '@/lib/db';
import { KINDS, type Kind, type SubmissionStatus, type SubmitType } from '@/lib/domain';
import { fmtDateTime } from '@/lib/format';
import { Alert, KindIcon, MediaPreview, SubmissionChip } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { SubmitTaskForm } from '@/components/SubmitTaskForm';

export const metadata: Metadata = { title: 'Задание' };

type Task = { id: number; title: string; kind: Kind; duration: string; points: number; segments: string[]; channel: string; why: string; steps: string[]; submitTypes: SubmitType[]; joint: boolean; needsCurator: boolean; active: boolean };
type Sub = { id: number; status: SubmissionStatus; body: string | null; link: string | null; fileUrl: string | null; fileName: string | null; comment: string | null; reviewerRole: 'captain' | 'curator' | null; reviewerName: string | null; pointsAwarded: number; createdAt: Date; reviewedAt: Date | null };

export default async function TaskPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ sent?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const u = await requireAmbassador();
  const sql = db();
  const [t] = await sql<Task[]>`
    select id, title, kind, duration, points, segments, channel, why, steps, submit_types, joint, needs_curator, active
    from tasks where id = ${Number(id) || 0}`;
  if (!t || !u.segment || !t.segments.includes(u.segment)) notFound();
  const subs = await sql<Sub[]>`
    select s.id, s.status, s.body, s.link, s.file_url, s.file_name, s.comment, s.reviewer_role, r.name as reviewer_name,
           s.points_awarded, s.created_at, s.reviewed_at
    from submissions s left join users r on r.id = s.reviewer_id
    where s.user_id = ${u.id} and s.task_id = ${t.id} order by s.created_at desc`;
  const last = subs[0]?.status ?? null;
  const canSubmit = t.active && (!last || last === 'returned');
  const k = KINDS[t.kind];

  return (
    <div className="stack" style={{ '--gap': '18px', maxWidth: 760 } as React.CSSProperties}>
      <Link href="/me/tasks" className="link row" style={{ '--gap': '6px', fontSize: 14 } as React.CSSProperties}><Icon name="back" size={16} /> Все задания</Link>

      {sp.sent ? <Alert tone="good">Задание отправлено. {t.needsCurator ? 'Его проверит куратор программы.' : 'Его проверит капитан вашего региона.'} Мы пришлём уведомление.</Alert> : null}

      <article className="card" style={{ padding: 22, gap: 16 }}>
        <div className="row" style={{ '--gap': '14px', flexWrap: 'nowrap' } as React.CSSProperties}>
          <KindIcon kind={t.kind} size="lg" />
          <div className="min0 stack" style={{ '--gap': '4px' } as React.CSSProperties}>
            <h1 className="h2">{t.title}</h1>
            <p className="meta"><Icon name="clock" size={14} /> {t.duration} · {k.label} · <span className="pts">+{t.points} баллов</span></p>
          </div>
        </div>
        <div className="row">
          {t.joint ? <span className="chip good"><Icon name="tandem" size={13} /> вместе с тандемом</span> : null}
          {t.needsCurator ? <span className="chip warn"><Icon name="shield" size={13} /> проверяет куратор</span> : null}
          {last ? <SubmissionChip status={last} /> : null}
          {!t.active ? <span className="chip">задание в архиве</span> : null}
        </div>
        {t.why ? <p style={{ fontSize: 16 }}>{t.why}</p> : null}
        {t.steps.length ? (
          <div className="kv"><p className="label">Как сделать</p><ol className="steps">{t.steps.map((s, i) => <li key={i}><span>{s}</span></li>)}</ol></div>
        ) : null}
        {t.channel ? <div className="kv"><p className="label">Где публикуется</p><p>{t.channel}</p></div> : null}
        {t.needsCurator ? <Alert tone="warn">Съёмка на объекте или внешняя публикация: перед отправкой сверьтесь с памяткой «можно / нельзя» в контент-ките.</Alert> : null}

        {canSubmit ? (
          <>
            {last === 'returned' ? <Alert tone="warn">Задание вернули на доработку: {subs[0].comment}</Alert> : null}
            <SubmitTaskForm taskId={t.id} types={t.submitTypes} blobEnabled={blobEnabled()} />
          </>
        ) : last === 'pending' ? (
          <Alert>Задание на проверке. Обычно проверка занимает до 48 часов.</Alert>
        ) : last === 'approved' ? (
          <Alert tone="good">Задание выполнено и принято: +{subs[0].pointsAwarded} баллов.</Alert>
        ) : null}
      </article>

      {subs.length ? (
        <section className="card">
          <p className="label">История сдачи</p>
          <ul className="list">
            {subs.map((s) => (
              <li key={s.id} className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
                <div className="between">
                  <span className="fine">{fmtDateTime(s.createdAt)}</span>
                  <SubmissionChip status={s.status} />
                </div>
                {s.body ? <p className="text-pre" style={{ fontSize: 14.5 }}>{s.body}</p> : null}
                {s.link ? <a className="link" href={s.link} target="_blank" rel="noreferrer">{s.link}</a> : null}
                {s.fileUrl ? <MediaPreview id={s.id} url={s.fileUrl} name={s.fileName} /> : null}
                {s.status !== 'pending' && s.reviewerName ? (
                  <p className="fine">
                    {s.reviewerRole === 'captain' ? 'Капитан' : 'Куратор'} {s.reviewerName}
                    {s.reviewedAt ? `, ${fmtDateTime(s.reviewedAt)}` : ''}
                    {s.comment ? `: «${s.comment}»` : ''}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
