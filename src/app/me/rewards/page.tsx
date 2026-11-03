import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAmbassador } from '@/lib/auth';
import { db } from '@/lib/db';
import { LEVELS, REWARD_CATEGORIES, groupOf, levelOf } from '@/lib/domain';
import { fmtDate, fmtNum } from '@/lib/format';
import { Alert, PageHead } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { SubmitButton } from '@/components/SubmitButton';
import { redeemReward } from '@/app/actions/me';
import { PriorityCard } from '@/components/PriorityCard';

export const metadata: Metadata = { title: 'Награды' };

type Reward = { id: number; title: string; category: string; cost: number; minLevel: number; audience: string; note: string | null };
type Req = { id: number; title: string; cost: number; status: 'requested' | 'fulfilled' | 'cancelled'; createdAt: Date };

export default async function RewardsPage({ searchParams }: { searchParams: Promise<{ cat?: string; ok?: string; err?: string }> }) {
  const sp = await searchParams;
  const u = await requireAmbassador();
  const sql = db();
  const group = groupOf(u.segment);
  const lv = levelOf(u.points);
  const balance = u.points - u.spent;
  const cat = sp.cat && (REWARD_CATEGORIES as readonly string[]).includes(sp.cat) ? sp.cat : null;
  const rewards = await sql<Reward[]>`
    select id, title, category, cost, min_level, audience, note from rewards
    where active and audience in ('all', ${group}) ${cat ? sql`and category = ${cat}` : sql``}
    order by sort, cost`;
  const mine = await sql<Req[]>`
    select d.id, w.title, d.cost, d.status, d.created_at from redemptions d join rewards w on w.id = d.reward_id
    where d.user_id = ${u.id} order by d.created_at desc limit 10`;
  const [{ done, authored }] = await sql<{ done: number; authored: number }[]>`
    select count(*)::int as done, count(*) filter (where i.author_id = ${u.id})::int as authored
    from initiative_members m join initiatives i on i.id = m.initiative_id
    where m.user_id = ${u.id} and m.status = 'accepted' and i.status = 'done'`;
  const requested = new Set((await sql<{ rewardId: number }[]>`select reward_id from redemptions where user_id = ${u.id} and status = 'requested'`).map((r) => r.rewardId));

  return (
    <>
      <PageHead title="Награды" eyebrow="Баллы меняются на опыт" sub="Оплаты нет, зато есть рост, признание и карьерные возможности. Уровень открывает новые награды." />
      <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
        {sp.ok ? <Alert tone="good">{sp.ok}</Alert> : null}
        {sp.err ? <Alert tone="bad">{sp.err}</Alert> : null}
        <section className="card balance">
          <div>
            <p className="label">На счёте</p>
            <p className="balance-v">{fmtNum(balance)}</p>
            <p className="fine">Заработано за сезон {fmtNum(u.points)}, потрачено {fmtNum(u.spent)}. Уровень считается по заработанным баллам.</p>
          </div>
          <Link className="btn" href="/me/tasks">Заработать баллы <Icon name="arrow" size={16} /></Link>
        </section>
        <PriorityCard segment={u.segment} points={u.points} done={done} authored={authored} />
        <nav className="tabs" aria-label="Категории">
          <Link href="/me/rewards" aria-current={!cat ? 'page' : undefined}>Все</Link>
          {REWARD_CATEGORIES.map((c) => <Link key={c} href={`/me/rewards?cat=${encodeURIComponent(c)}`} aria-current={cat === c ? 'page' : undefined}>{c}</Link>)}
        </nav>
        <div className="grid-2">
          {rewards.map((r) => {
            const locked = lv.n < r.minLevel;
            const short = balance < r.cost;
            const pending = requested.has(r.id);
            return (
              <article key={r.id} className="rw">
                <p style={{ fontWeight: 600 }}>{r.title}</p>
                <div className="rw-act">
                  {pending ? <span className="chip good"><Icon name="check" size={13} /> Заявка у куратора</span>
                    : locked ? <span className="chip"><Icon name="lock" size={13} /> с уровня «{LEVELS[r.minLevel - 1].name}»</span>
                    : short ? <span className="chip">не хватает {fmtNum(r.cost - balance)}</span>
                    : (
                      <details className="disclose">
                        <summary className="btn small primary">Обменять</summary>
                        <form action={redeemReward} className="confirm">
                          <input type="hidden" name="rewardId" value={r.id} />
                          <span className="fine">Спишем {fmtNum(r.cost)}, останется {fmtNum(balance - r.cost)}.</span>
                          <SubmitButton className="btn small primary" pendingText="Отправляю…">Подтвердить</SubmitButton>
                        </form>
                      </details>
                    )}
                </div>
                <p className="meta"><span className="pts">{fmtNum(r.cost)} баллов</span> · {r.category}{r.note ? <span className="chip">{r.note}</span> : null}</p>
              </article>
            );
          })}
        </div>
        {!rewards.length ? <p className="sub">В этой категории для вашей роли наград нет.</p> : null}
        <p className="fine">{group === 'external'
          ? 'Приоритет при отборе на практику не обменивается на баллы: его дают за вклад в сезон. Денежных и бонусных наград в программе нет.'
          : 'Вклад в программу фиксируется в карьерном профиле сотрудника. Денежных и бонусных наград в программе нет.'}</p>
        {mine.length ? (
          <section className="card">
            <p className="label">Мои заявки</p>
            <ul className="list">
              {mine.map((m) => (
                <li key={m.id} className="between">
                  <span className="min0"><b style={{ fontWeight: 600 }}>{m.title}</b><br /><span className="fine">{fmtDate(m.createdAt)} · {fmtNum(m.cost)} баллов</span></span>
                  <span className={`chip ${m.status === 'fulfilled' ? 'good' : m.status === 'requested' ? 'warn' : ''}`}>
                    {m.status === 'fulfilled' ? 'выдана' : m.status === 'requested' ? 'у куратора' : 'отменена'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  );
}
