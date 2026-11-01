import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireCurator } from '@/lib/auth';
import { db } from '@/lib/db';
import { Alert, PageHead } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { TaskForm, type TaskData } from '@/components/TaskForm';

export const metadata: Metadata = { title: 'Редактирование задания' };

export default async function EditTask({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ err?: string }> }) {
  await requireCurator();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [t] = await db()<(TaskData & { id: number })[]>`
    select id, title, kind, duration, points, segments, channel, why, steps, submit_types, joint, needs_curator, active, sort
    from tasks where id = ${Number(id) || 0}`;
  if (!t) notFound();
  return (
    <div className="stack" style={{ '--gap': '16px' } as React.CSSProperties}>
      <Link href="/curator/tasks" className="link row" style={{ '--gap': '6px', fontSize: 14 } as React.CSSProperties}><Icon name="back" size={16} /> Все задания</Link>
      <PageHead title="Редактирование задания" sub="Изменения сразу увидят амбассадоры. Уже начисленные баллы не пересчитываются." />
      {sp.err ? <Alert tone="bad">{sp.err}</Alert> : null}
      <TaskForm t={t} />
    </div>
  );
}
