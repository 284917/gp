import type { Metadata } from 'next';
import Link from 'next/link';
import { requireCurator } from '@/lib/auth';
import { Alert, PageHead } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { EMPTY_TASK, TaskForm } from '@/components/TaskForm';

export const metadata: Metadata = { title: 'Новое задание' };

export default async function NewTask({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  await requireCurator();
  const sp = await searchParams;
  return (
    <div className="stack" style={{ '--gap': '16px' } as React.CSSProperties}>
      <Link href="/curator/tasks" className="link row" style={{ '--gap': '6px', fontSize: 14 } as React.CSSProperties}><Icon name="back" size={16} /> Все задания</Link>
      <PageHead title="Новое задание" sub="Короткие и конкретные задания выполняют чаще. Для объектов — до 10 минут с телефона." />
      {sp.err ? <Alert tone="bad">{sp.err}</Alert> : null}
      <TaskForm t={EMPTY_TASK} />
    </div>
  );
}
