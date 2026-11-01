import type { Metadata } from 'next';
import Link from 'next/link';
import { requireCurator } from '@/lib/auth';
import { db } from '@/lib/db';
import { AUDIENCE_LABEL, LEVELS, REWARD_CATEGORIES, SEGMENTS, levelOf, type Segment } from '@/lib/domain';
import { fmtNum, timeAgo } from '@/lib/format';
import { Alert, Avatar, Empty, PageHead } from '@/components/ui';
import { SubmitButton } from '@/components/SubmitButton';
import { resolveRedemption, saveReward, toggleReward } from '@/app/actions/curator';

export const metadata: Metadata = { title: 'Награды' };

type Reward = { id: number; title: string; category: string; cost: number; minLevel: number; audience: 'all' | 'internal' | 'external'; note: string | null; active: boolean; given: number };
type Req = { id: number; userId: number; userName: string; segment: Segment; city: string; points: number; title: string; cost: number; createdAt: Date };

export default async function CuratorRewards({ searchParams }: { searchParams: Promise<{ edit?: string; ok?: string; err?: string }> }) {
  await requireCurator();
  const sp = await searchParams;
  const sql = db();
  const requests = await sql<Req[]>`
    select d.id, u.id as user_id, u.name as user_name, u.segment, r.city, u.points, w.title, d.cost, d.created_at
    from redemptions d join users u on u.id = d.user_id join rewards w on w.id = d.reward_id left join regions r on r.id = u.region_id
    where d.status = 'requested' order by d.created_at`;
  const rewards = await sql<Reward[]>`
    select w.id, w.title, w.category, w.cost, w.min_level, w.audience, w.note, w.active,
      (select count(*)::int from redemptions d where d.reward_id = w.id and d.status = 'fulfilled') as given
    from rewards w order by w.active desc, w.sort, w.id`;
  const editing = rewards.find((r) => String(r.id) === sp.edit);
  const f = editing ?? { id: 0, title: '', category: 'Мерч', cost: 300, minLevel: 1, audience: 'all' as const, note: '' };

  return (
    <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
      <PageHead title="Награды" eyebrow="Мотивация без оплаты" sub="Заявки амбассадоров на обмен баллов и каталог наград." />
      {sp.ok ? <Alert tone="good">Награда сохранена.</Alert> : null}
      {sp.err ? <Alert tone="bad">{sp.err}</Alert> : null}

      <section className="stack" style={{ '--gap': '10px' } as React.CSSProperties}>
        <div className="between"><h2 className="h3">Ждут выдачи</h2><span className="chip warn">{requests.length}</span></div>
        {requests.length ? (
          <div className="mod-list">
            {requests.map((q) => (
              <article key={q.id} className="mod">
                <div className="mod-top">
                  <Avatar name={q.userName} className="soft sm" />
                  <div className="mod-who"><Link className="rowlink" style={{ fontWeight: 700, textDecoration: 'none' }} href={`/curator/ambassadors/${q.userId}`}>{q.userName}</Link><span>{SEGMENTS[q.segment]?.label} · {q.city} · {levelOf(q.points).name} · {timeAgo(q.createdAt)}</span></div>
                </div>
                <p className="mod-title">{q.title} <span className="pts">{fmtNum(q.cost)}</span></p>
                <div className="btns">
                  <form action={resolveRedemption}><input type="hidden" name="id" value={q.id} /><input type="hidden" name="action" value="fulfill" /><SubmitButton className="btn small primary" pendingText="…">Выдано</SubmitButton></form>
                  <form action={resolveRedemption}><input type="hidden" name="id" value={q.id} /><input type="hidden" name="action" value="cancel" /><SubmitButton className="btn small" pendingText="…">Отменить и вернуть баллы</SubmitButton></form>
                </div>
              </article>
            ))}
          </div>
        ) : <Empty icon="gift" title="Все награды выданы" />}
      </section>

      <div className="grid-main">
        <section className="card" style={{ padding: 8 }}>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Награда</th><th>Цена</th><th>Для кого</th><th>Уровень</th><th>Выдано</th><th></th></tr></thead>
              <tbody>
                {rewards.map((r) => (
                  <tr key={r.id} style={{ opacity: r.active ? 1 : 0.55 }}>
                    <td><Link className="rowlink" href={`/curator/rewards?edit=${r.id}`}>{r.title}</Link><br /><span className="fine">{r.category}{r.note ? ` · ${r.note}` : ''}</span></td>
                    <td className="n">{fmtNum(r.cost)}</td>
                    <td className="nowrap">{AUDIENCE_LABEL[r.audience]}</td>
                    <td className="nowrap">{LEVELS[r.minLevel - 1]?.name}</td>
                    <td className="n">{r.given}</td>
                    <td><form action={toggleReward}><input type="hidden" name="id" value={r.id} /><SubmitButton className="btn small ghost" pendingText="…">{r.active ? 'Скрыть' : 'Показать'}</SubmitButton></form></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <form action={saveReward} className="card form" key={f.id}>
          <div className="between"><p className="label">{editing ? 'Редактирование' : 'Новая награда'}</p>{editing ? <Link className="link" style={{ fontSize: 13 }} href="/curator/rewards">Отмена</Link> : null}</div>
          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
          <div className="field-wrap"><label className="flabel" htmlFor="r-title">Название</label><input id="r-title" name="title" className="field" defaultValue={f.title} required /></div>
          <div className="grid-2" style={{ gap: 10 }}>
            <div className="field-wrap"><label className="flabel" htmlFor="r-cat">Категория</label><select id="r-cat" name="category" className="field" defaultValue={f.category}>{REWARD_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
            <div className="field-wrap"><label className="flabel" htmlFor="r-cost">Цена в баллах</label><input id="r-cost" name="cost" type="number" min={1} className="field" defaultValue={f.cost} required /></div>
            <div className="field-wrap"><label className="flabel" htmlFor="r-aud">Для кого</label><select id="r-aud" name="audience" className="field" defaultValue={f.audience}><option value="all">Все</option><option value="internal">Сотрудники</option><option value="external">Студенты</option></select></div>
            <div className="field-wrap"><label className="flabel" htmlFor="r-lvl">С уровня</label><select id="r-lvl" name="minLevel" className="field" defaultValue={f.minLevel}>{LEVELS.map((l) => <option key={l.n} value={l.n}>{l.name}</option>)}</select></div>
          </div>
          <div className="field-wrap"><label className="flabel" htmlFor="r-note">Пометка</label><input id="r-note" name="note" className="field" defaultValue={f.note ?? ''} placeholder="Например: нужно согласование" /></div>
          <div><SubmitButton>{editing ? 'Сохранить' : 'Добавить награду'}</SubmitButton></div>
        </form>
      </div>
    </div>
  );
}
