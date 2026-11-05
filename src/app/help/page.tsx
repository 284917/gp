import type { Metadata } from 'next';
import Link from 'next/link';
import { Brand } from '@/components/ui';
import { Icon, Wave } from '@/components/Icon';
import { HelpForm } from '@/components/SupportForms';
import { getUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { fmtDate } from '@/lib/format';
import { QUESTION_TOPICS, isQuestionTopic, type QuestionTopic } from '@/lib/support';

export const metadata: Metadata = { title: 'Вопрос куратору' };
export const dynamic = 'force-dynamic';

type Mine = { id: number; topic: QuestionTopic; body: string; status: 'open' | 'closed'; reply: string | null; createdAt: Date; answeredAt: Date | null };

export default async function HelpPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const sp = await searchParams;
  const user = await getUser().catch(() => null);
  const topic: QuestionTopic = isQuestionTopic(sp.topic) ? sp.topic : user ? 'program' : 'application';
  const mine: Mine[] = user
    ? await db()<Mine[]>`
        select id, topic, body, status, reply, created_at, answered_at from questions
        where user_id = ${user.id} or lower(email) = ${user.email.toLowerCase()}
        order by created_at desc limit 10`
    : [];
  const back = !user ? { href: '/', label: 'На главную' }
    : user.role === 'curator' ? { href: '/curator/questions', label: 'К вопросам участников' }
    : user.status === 'active' ? { href: '/me', label: 'В кабинет' }
    : { href: '/status', label: 'К статусу заявки' };

  return (
    <div className="auth">
      <aside className="auth-side">
        <Brand />
        <div className="stack" style={{ '--gap': '16px' } as React.CSSProperties}>
          <h1 className="display">Вопрос куратору</h1>
          <p className="lead hide-sm">Кураторы программы работают в Санкт-Петербурге и отвечают в течение пары рабочих дней. Забыли пароль — напишите, и куратор выдаст временный.</p>
        </div>
        <Wave width={220} height={100} className="hide-sm" />
      </aside>
      <main id="main" className="auth-main">
        <div className="auth-box wide">
          <Link href={back.href} className="link row back-link"><Icon name="back" size={16} /> {back.label}</Link>
          <div className="stack" style={{ '--gap': '6px' } as React.CSSProperties}>
            <p className="eyebrow">Связь с кураторами</p>
            <h2 className="h1">Задайте вопрос</h2>
          </div>
          <HelpForm topic={topic} user={user ? { name: user.name, email: user.email } : null} />
          {mine.length ? (
            <section className="card">
              <p className="label">Мои вопросы</p>
              <ul className="list">
                {mine.map((q) => (
                  <li key={q.id} className="stack" style={{ '--gap': '6px' } as React.CSSProperties}>
                    <div className="between">
                      <span className="fine">{QUESTION_TOPICS[q.topic]} · {fmtDate(q.createdAt)}</span>
                      <span className={`chip ${q.status === 'open' ? 'warn' : 'good'}`}>{q.status === 'open' ? 'ждёт ответа' : 'отвечен'}</span>
                    </div>
                    <p className="text-pre" style={{ fontSize: 14 }}>{q.body}</p>
                    {q.reply ? <p className="q-reply text-pre"><b>Куратор:</b> {q.reply}</p> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
