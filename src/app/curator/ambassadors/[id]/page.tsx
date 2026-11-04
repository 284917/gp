import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireCurator } from '@/lib/auth';
import { db } from '@/lib/db';
import { SEGMENTS, groupOf, levelOf, type Segment, type SubmissionStatus } from '@/lib/domain';
import { fmtDate, fmtNum, timeAgo } from '@/lib/format';
import { Avatar, SubmissionChip } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { SubmitButton } from '@/components/SubmitButton';
import { addPoints, remind, setCaptain, setMentor, setUserStatus } from '@/app/actions/curator';

export const metadata: Metadata = { title: 'Амбассадор' };

type U = { id: number; name: string; email: string; phone: string | null; segment: Segment; regionId: string; city: string; status: string; isCaptain: boolean; points: number; spent: number; org: string | null; position: string | null; motivation: string | null; mentorId: number | null; mentorName: string | null; createdAt: Date; approvedAt: Date | null; lastActiveAt: Date | null; iniJoined: number; iniAuthored: number };

export default async function AmbassadorPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCurator();
  const { id } = await params;
  const sql = db();
  const [u] = await sql<U[]>`
    select u.id, u.name, u.email, u.phone, u.segment, u.region_id, r.city, u.status, u.is_captain, u.points, u.spent, u.org, u.position, u.motivation,
      u.mentor_id, m.name as mentor_name, u.created_at, u.approved_at, u.last_active_at,
      (select count(*)::int from initiatives i where i.status = 'done' and (i.author_id = u.id or exists (select 1 from initiative_members im where im.initiative_id = i.id and im.user_id = u.id and im.status = 'accepted'))) as ini_joined,
      (select count(*)::int from initiatives i where i.status = 'done' and i.author_id = u.id) as ini_authored
    from users u left join regions r on r.id = u.region_id left join users m on m.id = u.mentor_id
    where u.id = ${Number(id) || 0} and u.role = 'ambassador'`;
  if (!u) notFound();
  const group = groupOf(u.segment);
  const subs = await sql<{ id: number; title: string; status: SubmissionStatus; pointsAwarded: number; createdAt: Date; comment: string | null }[]>`
    select s.id, t.title, s.status, s.points_awarded, s.created_at, s.comment from submissions s join tasks t on t.id = s.task_id
    where s.user_id = ${u.id} order by s.created_at desc limit 40`;
  const adj = await sql<{ id: number; amount: number; reason: string; createdAt: Date }[]>`
    select id, amount, reason, created_at from point_adjustments where user_id = ${u.id} order by created_at desc limit 20`;
  const mentees = group === 'internal'
    ? await sql<{ id: number; name: string; segment: Segment }[]>`select id, name, segment from users where mentor_id = ${u.id} and status = 'active' order by name`
    : [];
  const mentors = group === 'external'
    ? await sql<{ id: number; name: string; segment: Segment; city: string }[]>`
        select u.id, u.name, u.segment, r.city from users u join regions r on r.id = u.region_id
        where u.role = 'ambassador' and u.status = 'active' and u.segment in ('office', 'site')
        order by (u.region_id = ${u.regionId}) desc, u.name limit 200`
    : [];
  const lv = levelOf(u.points, u);

  return (
    <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
      <Link href="/curator/ambassadors" className="link row" style={{ '--gap': '6px', fontSize: 14 } as React.CSSProperties}><Icon name="back" size={16} /> Все амбассадоры</Link>
      <section className="card" style={{ padding: 22 }}>
        <div className="profile-head">
          <Avatar name={u.name} className="lg" />
          <div className="stack grow" style={{ '--gap': '4px' } as React.CSSProperties}>
            <div className="row"><h1 className="h2">{u.name}</h1>{u.isCaptain ? <span className="chip accent">капитан региона</span> : null}{u.status === 'paused' ? <span className="chip">на паузе</span> : null}</div>
            <p className="sub">{SEGMENTS[u.segment]?.long} · {u.city} · {u.org}{u.position ? `, ${u.position}` : ''}</p>
            <p className="fine">{u.email}{u.phone ? ` · ${u.phone}` : ''} · в программе с {fmtDate(u.approvedAt ?? u.createdAt)} · заходил(а) {timeAgo(u.lastActiveAt)}</p>
          </div>
        </div>
        <div className="stat-row">
          <div><span className="label">Уровень</span><b>{lv.name}</b></div>
          <div><span className="label">Баллы сезона</span><b>{fmtNum(u.points)}</b></div>
          <div><span className="label">На счёте</span><b>{fmtNum(u.points - u.spent)}</b></div>
          <div><span className="label">Принято заданий</span><b>{subs.filter((s) => s.status === 'approved').length}</b></div>
        </div>
        {u.motivation ? <p className="sub">«{u.motivation}»</p> : null}
      </section>

      <div className="grid-main">
        <section className="card">
          <p className="label">Задания</p>
          {subs.length ? (
            <ul className="list">
              {subs.map((s) => (
                <li key={s.id} className="between">
                  <span className="min0">{s.title}<br /><span className="fine">{fmtDate(s.createdAt)}{s.pointsAwarded ? ` · +${s.pointsAwarded}` : ''}{s.comment ? ` · «${s.comment}»` : ''}</span></span>
                  <SubmissionChip status={s.status} />
                </li>
              ))}
            </ul>
          ) : <p className="sub">Заданий пока нет.</p>}
        </section>

        <div className="stack">
          <section className="card">
            <p className="label">Управление</p>
            <div className="btns">
              <form action={setCaptain}>
                <input type="hidden" name="id" value={u.id} /><input type="hidden" name="value" value={String(!u.isCaptain)} />
                <SubmitButton className={u.isCaptain ? 'btn small' : 'btn small primary'}>{u.isCaptain ? 'Снять с роли капитана' : 'Назначить капитаном региона'}</SubmitButton>
              </form>
              <form action={setUserStatus}>
                <input type="hidden" name="id" value={u.id} /><input type="hidden" name="status" value={u.status === 'paused' ? 'active' : 'paused'} />
                <SubmitButton className="btn small">{u.status === 'paused' ? 'Вернуть в программу' : 'Поставить на паузу'}</SubmitButton>
              </form>
            </div>
            {!u.isCaptain && lv.n < 4 ? <p className="fine">Капитанами обычно становятся амбассадоры уровня «Лидер»: 1200 баллов и своя реализованная инициатива.</p> : null}
          </section>

          <section className="card">
            <p className="label">Напомнить о себе</p>
            <form action={remind} className="form" style={{ gap: 10 }}>
              <input type="hidden" name="id" value={u.id} />
              <textarea name="text" className="field" rows={2} placeholder="Куратор напоминает: на этой неделе есть короткие задания на 5–10 минут." aria-label="Текст напоминания" />
              <div><SubmitButton className="btn small"><Icon name="bell" size={15} /> Отправить уведомление</SubmitButton></div>
            </form>
          </section>

          <section className="card">
            <p className="label">Бонусные баллы</p>
            <form action={addPoints} className="form" style={{ gap: 10 }}>
              <input type="hidden" name="id" value={u.id} />
              <div className="grid-2" style={{ gap: 10 }}>
                <input name="amount" type="number" className="field" placeholder="Сколько, например 50" aria-label="Баллы" required />
                <input name="reason" className="field" placeholder="За что" aria-label="Причина" required />
              </div>
              <div><SubmitButton className="btn small">Начислить</SubmitButton></div>
            </form>
            {adj.length ? (
              <ul className="list" style={{ fontSize: 14 }}>
                {adj.map((a) => <li key={a.id} className="between"><span className="min0">{a.reason} <span className="fine">· {fmtDate(a.createdAt)}</span></span><span className="pts">{a.amount > 0 ? '+' : ''}{a.amount}</span></li>)}
              </ul>
            ) : null}
          </section>

          <section className="card">
            <p className="label">Тандем</p>
            {group === 'external' ? (
              <form action={setMentor} className="form" style={{ gap: 10 }}>
                <input type="hidden" name="id" value={u.id} />
                <select name="mentorId" className="field" defaultValue={u.mentorId ?? ''} aria-label="Наставник">
                  <option value="">Без наставника</option>
                  {mentors.map((m) => <option key={m.id} value={m.id}>{m.name} — {SEGMENTS[m.segment].label}, {m.city}</option>)}
                </select>
                <div><SubmitButton className="btn small">Сохранить наставника</SubmitButton></div>
              </form>
            ) : mentees.length ? (
              <ul className="list">{mentees.map((m) => <li key={m.id}><Link className="link" href={`/curator/ambassadors/${m.id}`}>{m.name}</Link> <span className="fine">· {SEGMENTS[m.segment].label}</span></li>)}</ul>
            ) : <p className="sub">Студентов в тандеме пока нет. Наставника назначают в карточке студента.</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
