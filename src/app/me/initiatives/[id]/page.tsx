import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAmbassador } from '@/lib/auth';
import { getInitiative } from '@/lib/initiatives';
import { Alert } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { InitiativeView } from '@/components/InitiativeView';
import { JoinForm, ReportForm } from '@/components/InitiativeForms';
import { SubmitButton } from '@/components/SubmitButton';
import { decideMember, leaveInitiative, startWork } from '@/app/actions/initiatives';

export const metadata: Metadata = { title: 'Инициатива' };

export default async function InitiativePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const u = await requireAmbassador();
  const d = await getInitiative(Number(id));
  if (!d || ((d.status === 'idea' || d.status === 'declined') && !d.members.some((m) => m.id === u.id))) notFound();

  const me = d.members.find((m) => m.id === u.id);
  const isAuthor = d.authorId === u.id;
  const accepted = d.members.filter((m) => m.status === 'accepted').length;
  const open = (d.status === 'recruiting' || d.status === 'active') && accepted < d.teamSize;

  const actions = (
    <>
      {sp.created ? <Alert tone="good" icon="rocket">Идея у куратора. Как только её согласуют, проект появится на бирже и откроется набор команды.</Alert> : null}
      {d.status === 'declined' && d.curatorComment ? <Alert tone="bad">Куратор: {d.curatorComment}</Alert> : null}
      {d.status === 'active' && d.curatorComment && isAuthor ? <Alert tone="warn">Итоги вернули на доработку: {d.curatorComment}</Alert> : null}
      {d.status === 'reporting' ? <Alert tone="good" icon="check">Итоги у куратора. После проверки команда получит баллы, а проект попадёт в библиотеку форматов.</Alert> : null}
      {d.status === 'recruiting' && d.curatorComment ?<Alert>Комментарий куратора: {d.curatorComment}</Alert> : null}

      {isAuthor && d.status === 'recruiting' ? (
        <section className="card action-card" data-reveal>
          <p className="label">Вы автор</p>
          <p className="sub">{accepted < 2 ? 'Примите хотя бы одного участника из откликов, чтобы начать работу.' : 'Когда команда готова, отметьте старт: набор закроется, а команда получит уведомление.'}</p>
          <form action={startWork}>
            <input type="hidden" name="id" value={d.id} />
            <SubmitButton className="btn primary wide" disabled={accepted < 2} pendingText="Запускаю…"><Icon name="rocket" size={18} /> Команда собрана, начинаем</SubmitButton>
          </form>
        </section>
      ) : null}

      {!isAuthor && !me && open ? (
        <section className="card action-card glow" data-reveal>
          <p className="label">Присоединиться</p>
          <JoinForm id={d.id} />
        </section>
      ) : null}

      {!isAuthor && me?.status === 'requested' ? (
        <section className="card action-card" data-reveal>
          <p className="label">Ваш отклик</p>
          <Alert tone="good">Отклик отправлен автору. Когда он ответит, придёт уведомление.</Alert>
          <form action={leaveInitiative}><input type="hidden" name="id" value={d.id} /><SubmitButton className="btn small ghost" pendingText="Отменяю…">Отозвать отклик</SubmitButton></form>
        </section>
      ) : null}

      {!isAuthor && me?.status === 'accepted' && d.status !== 'done' ? (
        <section className="card action-card" data-reveal>
          <p className="label">Вы в команде</p>
          <p className="sub">Договоритесь с автором о ролях и сроках. Когда проект завершится, все участники получат баллы.</p>
          {d.status !== 'reporting' ? (
            <form action={leaveInitiative}><input type="hidden" name="id" value={d.id} /><SubmitButton className="btn small ghost" pendingText="Выхожу…">Выйти из команды</SubmitButton></form>
          ) : null}
        </section>
      ) : null}

      {d.status === 'done' ? (
        <section className="card action-card glow" data-reveal>
          <p className="label">Формат из библиотеки</p>
          <p className="sub">Возьмите инструкцию команды и проведите такой же проект для своей аудитории. Автор получит баллы, когда вы завершите повтор.</p>
          <Link href={`/me/initiatives/new?from=${d.id}`} className="btn primary wide"><Icon name="repeat" size={18} /> Повторить в моём регионе</Link>
        </section>
      ) : null}
    </>
  );

  return (
    <>
      <Link href="/me/initiatives" className="link row back-link"><Icon name="back" size={16} /> К бирже</Link>
      <InitiativeView
        d={d}
        base="/me/initiatives"
        actions={actions}
        teamActions={isAuthor && open ? (userId) => (
          <div className="btns">
            <form action={decideMember}>
              <input type="hidden" name="id" value={d.id} /><input type="hidden" name="userId" value={userId} /><input type="hidden" name="decision" value="accept" />
              <SubmitButton className="btn small primary" pendingText="…"><Icon name="check" size={16} /> Принять</SubmitButton>
            </form>
            <form action={decideMember}>
              <input type="hidden" name="id" value={d.id} /><input type="hidden" name="userId" value={userId} /><input type="hidden" name="decision" value="decline" />
              <SubmitButton className="btn small ghost" pendingText="…">Не сейчас</SubmitButton>
            </form>
          </div>
        ) : undefined}
        below={isAuthor && d.status === 'active' ? (
          <section className="card" data-reveal style={{ padding: 22 }}>
            <div className="stack" style={{ '--gap': '4px' } as React.CSSProperties}>
              <p className="label">Итоги проекта</p>
              <h2 className="h3">Расскажите, что получилось</h2>
              <p className="sub">Куратор проверит публикации и итоги. После этого команда получит баллы, а проект станет форматом в библиотеке.</p>
            </div>
            <ReportForm id={d.id} />
          </section>
        ) : undefined}
      />
    </>
  );
}
