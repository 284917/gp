import type { Metadata } from 'next';
import Link from 'next/link';
import { requireCurator } from '@/lib/auth';
import { db } from '@/lib/db';
import { fmtDate, timeAgo } from '@/lib/format';
import { QUESTION_TOPICS, type QuestionTopic } from '@/lib/support';
import { Avatar, Empty, PageHead } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { SubmitButton } from '@/components/SubmitButton';
import { answerQuestion, reopenQuestion } from '@/app/actions/support';

export const metadata: Metadata = { title: 'Вопросы' };

type Q = {
  id: number; name: string; email: string; topic: QuestionTopic; body: string; status: 'open' | 'closed'; reply: string | null;
  createdAt: Date; answeredAt: Date | null; linkedId: number | null; linkedStatus: string | null; answeredName: string | null;
};

export default async function QuestionsPage() {
  await requireCurator();
  const rows = await db()<Q[]>`
    select q.id, q.name, q.email, q.topic, q.body, q.status, q.reply, q.created_at, q.answered_at,
      u.id as linked_id, u.status as linked_status, a.name as answered_name
    from questions q
    left join users u on u.role = 'ambassador' and (u.id = q.user_id or (q.user_id is null and lower(u.email) = lower(q.email)))
    left join users a on a.id = q.answered_by
    order by (q.status = 'open') desc, q.created_at desc
    limit 80`;
  const open = rows.filter((q) => q.status === 'open');
  const closed = rows.filter((q) => q.status === 'closed').slice(0, 20);
  const mail = (q: Q) => `mailto:${q.email}?subject=${encodeURIComponent('Голос компании: ответ на ваш вопрос')}`;

  return (
    <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
      <PageHead title="Вопросы" eyebrow="Связь с участниками"
        sub="Вопросы с сайта: доступ в кабинет, заявки и всё остальное. Ответ приходит участнику уведомлением в кабинет, человеку без кабинета ответьте на почту." />
      {open.length ? (
        <div className="mod-list">
          {open.map((q) => (
            <article key={q.id} className="mod">
              <div className="mod-top">
                <Avatar name={q.name} className="soft sm" />
                <div className="mod-who"><b>{q.name}</b><span><a className="link" href={mail(q)}>{q.email}</a> · {timeAgo(q.createdAt)}</span></div>
              </div>
              <p className="mod-title"><span className={`chip ${q.topic === 'access' ? 'accent' : 'brand'}`}>{QUESTION_TOPICS[q.topic]}</span></p>
              <p className="text-pre" style={{ fontSize: 14 }}>{q.body}</p>
              {q.linkedId ? (
                <p className="fine">
                  <Link className="link" href={`/curator/ambassadors/${q.linkedId}`}>Карточка участника</Link>
                  {q.topic === 'access' ? ' — там можно сбросить пароль, вопрос закроется сам.' : q.linkedStatus === 'pending' ? ' · заявка ещё на рассмотрении' : ''}
                </p>
              ) : <p className="fine">Кабинета с этой почтой нет — ответьте письмом.</p>}
              <form action={answerQuestion} className="form" style={{ gap: 8 }}>
                <input type="hidden" name="id" value={q.id} />
                <textarea name="reply" className="field" rows={3} aria-label="Ответ"
                  placeholder={q.linkedId ? 'Ответ придёт уведомлением в кабинет участника' : 'Короткая пометка: что ответили на почту'} />
                <div className="btns">
                  <SubmitButton className="btn small primary" pendingText="Отправляю…">{q.linkedId ? 'Ответить и закрыть' : 'Закрыть вопрос'}</SubmitButton>
                  {!q.linkedId ? <a className="btn small" href={mail(q)}><Icon name="external" size={15} /> Написать письмо</a> : null}
                </div>
              </form>
            </article>
          ))}
        </div>
      ) : (
        <Empty icon="check" title="Новых вопросов нет">Когда участник напишет через форму «Вопрос куратору», вопрос появится здесь.</Empty>
      )}

      {closed.length ? (
        <section className="card">
          <p className="label">Закрытые</p>
          <ul className="list">
            {closed.map((q) => (
              <li key={q.id} className="stack" style={{ '--gap': '6px' } as React.CSSProperties}>
                <div className="between">
                  <span className="min0"><b style={{ fontWeight: 600 }}>{q.name}</b> <span className="fine">· {QUESTION_TOPICS[q.topic]} · {fmtDate(q.createdAt)}</span></span>
                  <form action={reopenQuestion}><input type="hidden" name="id" value={q.id} /><SubmitButton className="btn small ghost" pendingText="…">Открыть снова</SubmitButton></form>
                </div>
                <p className="sub text-pre">{q.body}</p>
                {q.reply ? <p className="q-reply text-pre"><b>{q.answeredName ?? 'Куратор'}:</b> {q.reply}</p> : <p className="fine">Закрыт без ответа в кабинете{q.answeredName ? ` · ${q.answeredName}` : ''}</p>}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
