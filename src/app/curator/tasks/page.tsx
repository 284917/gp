import type { Metadata } from 'next';
import Link from 'next/link';
import { requireCurator } from '@/lib/auth';
import { db } from '@/lib/db';
import { KINDS, SEGMENTS, type Kind, type Segment } from '@/lib/domain';
import { Alert, KindIcon, PageHead } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { SubmitButton } from '@/components/SubmitButton';
import { toggleTask } from '@/app/actions/curator';

export const metadata: Metadata = { title: 'Задания' };

type Row = { id: number; title: string; kind: Kind; points: number; segments: Segment[]; active: boolean; needsCurator: boolean; joint: boolean; approved: number; pending: number };

export default async function CuratorTasks({ searchParams }: { searchParams: Promise<{ ok?: string; show?: string }> }) {
  await requireCurator();
  const sp = await searchParams;
  const showArchive = sp.show === 'all';
  const rows = await db()<Row[]>`
    select t.id, t.title, t.kind, t.points, t.segments, t.active, t.needs_curator, t.joint,
      count(s.id) filter (where s.status = 'approved')::int as approved,
      count(s.id) filter (where s.status = 'pending')::int as pending
    from tasks t left join submissions s on s.task_id = t.id
    ${showArchive ? db()`` : db()`where t.active`}
    group by t.id order by t.active desc, t.sort, t.id`;
  return (
    <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
      <PageHead title="Задания" eyebrow="Задания недели"
        sub="Публикуйте задания для нужной аудитории: они сразу появятся в кабинетах амбассадоров."
        actions={<Link className="btn primary" href="/curator/tasks/new"><Icon name="plus" size={16} /> Новое задание</Link>} />
      {sp.ok ? <Alert tone="good">Задание сохранено.</Alert> : null}
      <nav className="tabs">
        <Link href="/curator/tasks" aria-current={!showArchive ? 'page' : undefined}>Опубликованные</Link>
        <Link href="/curator/tasks?show=all" aria-current={showArchive ? 'page' : undefined}>Все, включая архив</Link>
      </nav>
      <section className="card" style={{ padding: 8 }}>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Задание</th><th>Для кого</th><th>Баллы</th><th>Принято</th><th>Проверка</th><th></th></tr></thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} style={{ opacity: t.active ? 1 : 0.6 }}>
                  <td>
                    <div className="row" style={{ flexWrap: 'nowrap' }}>
                      <KindIcon kind={t.kind} size="sm" />
                      <span className="min0"><Link className="rowlink" href={`/curator/tasks/${t.id}`}>{t.title}</Link><br /><span className="fine">{KINDS[t.kind].label}{t.joint ? ' · с тандемом' : ''}</span></span>
                    </div>
                  </td>
                  <td><div className="row" style={{ '--gap': '4px' } as React.CSSProperties}>{t.segments.map((s) => <span key={s} className="chip">{SEGMENTS[s]?.label}</span>)}</div></td>
                  <td className="n"><span className="pts">+{t.points}</span></td>
                  <td className="n">{t.approved}{t.pending ? <span className="fine"> · {t.pending} ждут</span> : null}</td>
                  <td>{t.needsCurator ? <span className="chip warn">куратор</span> : <span className="chip">капитан</span>}</td>
                  <td className="nowrap">
                    <form action={toggleTask}>
                      <input type="hidden" name="id" value={t.id} />
                      <SubmitButton className="btn small ghost" pendingText="…">{t.active ? 'В архив' : 'Опубликовать'}</SubmitButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
