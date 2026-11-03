import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireCurator } from '@/lib/auth';
import { getInitiative, isMixed } from '@/lib/initiatives';
import { INITIATIVE_POINTS } from '@/lib/domain';
import { Alert } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { InitiativeView } from '@/components/InitiativeView';
import { SubmitButton } from '@/components/SubmitButton';
import { acceptReport, approveIdea, declineIdea, returnReport } from '@/app/actions/initiatives';

export const metadata: Metadata = { title: 'Инициатива' };

export default async function CuratorInitiative({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireCurator();
  const d = await getInitiative(Number(id));
  if (!d) notFound();
  const team = d.members.filter((m) => m.status === 'accepted');
  const mixed = isMixed(team);
  const total = team.reduce((a, m) => a + (m.id === d.authorId ? INITIATIVE_POINTS.author : INITIATIVE_POINTS.member) + (mixed ? INITIATIVE_POINTS.mixed : 0), 0);

  const actions = (
    <>
      {d.status === 'idea' ? (
        <section className="card action-card glow" data-reveal>
          <p className="label">Согласование идеи</p>
          {d.onSite ? <Alert tone="warn">Проект на АЗС или нефтебазе: проверьте допуск, зону съёмки и согласие руководителя объекта.</Alert> : null}
          <form action={approveIdea} className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
            <input type="hidden" name="id" value={d.id} />
            <textarea name="comment" className="field" rows={2} placeholder="Комментарий автору: что учесть, к кому обратиться" aria-label="Комментарий" />
            <div className="btns">
              <SubmitButton className="btn primary" pendingText="…"><Icon name="check" size={18} /> Согласовать и открыть набор</SubmitButton>
              <button type="submit" formAction={declineIdea} className="btn danger">Отклонить</button>
            </div>
          </form>
        </section>
      ) : null}
      {d.status === 'reporting' ? (
        <section className="card action-card glow" data-reveal>
          <p className="label">Проверка итогов</p>
          <p className="sub">Проверьте публикации по ссылке и инструкцию. После принятия команда получит {total} баллов на всех, а проект попадёт в библиотеку форматов.</p>
          <form action={acceptReport} className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
            <input type="hidden" name="id" value={d.id} />
            <textarea name="comment" className="field" rows={2} placeholder="Что доработать, если возвращаете" aria-label="Комментарий" />
            <div className="btns">
              <SubmitButton className="btn primary" pendingText="…"><Icon name="trophy" size={18} /> Принять итоги</SubmitButton>
              <button type="submit" formAction={returnReport} className="btn">Вернуть на доработку</button>
            </div>
          </form>
        </section>
      ) : null}
      {d.curatorComment && d.status !== 'idea' ? <Alert>Комментарий куратора: {d.curatorComment}</Alert> : null}
    </>
  );

  return (
    <>
      <Link href="/curator/initiatives" className="link row back-link"><Icon name="back" size={16} /> Все инициативы</Link>
      <InitiativeView d={d} base="/curator/initiatives" actions={actions} />
    </>
  );
}
