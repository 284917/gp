import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAmbassador } from '@/lib/auth';
import { db } from '@/lib/db';
import { SEGMENTS, levelOf, type SubmissionStatus } from '@/lib/domain';
import { fmtDate, fmtNum } from '@/lib/format';
import { Alert, Avatar, PageHead, SubmissionChip } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { PasswordForm, ProfileForm } from '@/components/ProfileForms';
import { logout } from '@/app/actions/auth';

export const metadata: Metadata = { title: 'Профиль' };

export default async function ProfilePage() {
  const u = await requireAmbassador();
  const sql = db();
  const subs = await sql<{ id: number; taskId: number; title: string; status: SubmissionStatus; pointsAwarded: number; createdAt: Date }[]>`
    select s.id, s.task_id, t.title, s.status, s.points_awarded, s.created_at
    from submissions s join tasks t on t.id = s.task_id where s.user_id = ${u.id} order by s.created_at desc limit 30`;
  const adj = await sql<{ id: number; amount: number; reason: string; createdAt: Date }[]>`
    select id, amount, reason, created_at from point_adjustments where user_id = ${u.id} order by created_at desc limit 20`;
  const [stats] = await sql<{ approved: number; pending: number }[]>`
    select count(*) filter (where status = 'approved')::int as approved, count(*) filter (where status = 'pending')::int as pending
    from submissions where user_id = ${u.id}`;
  const seg = u.segment ? SEGMENTS[u.segment] : SEGMENTS.office;

  return (
    <>
      <PageHead title="Профиль" eyebrow="Мой кабинет" actions={<form action={logout}><button className="btn" type="submit"><Icon name="logout" size={16} /> Выйти</button></form>} />
      <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
        {u.passwordTemp ? <Alert tone="warn" icon="lock">Вы вошли по временному паролю. <a className="link" href="#password">Задайте свой пароль</a> — это займёт минуту.</Alert> : null}
        <section className="card" style={{ padding: 22 }}>
          <div className="profile-head">
            <Avatar name={u.name} className="lg" />
            <div className="stack grow" style={{ '--gap': '4px' } as React.CSSProperties}>
              <h2 className="h2">{u.name}</h2>
              <p className="sub">{seg.long} · {u.regionName}{u.isCaptain ? ' · капитан региона' : ''} · {u.email}</p>
            </div>
          </div>
          <div className="stat-row">
            <div><span className="label">Уровень</span><b>{levelOf(u.points, u).name}</b></div>
            <div><span className="label">Баллы сезона</span><b>{fmtNum(u.points)}</b></div>
            <div><span className="label">На счёте</span><b>{fmtNum(u.points - u.spent)}</b></div>
            <div><span className="label">Заданий принято</span><b>{stats.approved}</b></div>
          </div>
        </section>

        <div className="grid-2" style={{ alignItems: 'start' }}>
          <section className="card">
            <p className="label">История заданий</p>
            {subs.length ? (
              <ul className="list">
                {subs.map((s) => (
                  <li key={s.id} className="between">
                    <Link href={`/me/tasks/${s.taskId}`} className="min0" style={{ textDecoration: 'none' }}>
                      <b style={{ fontWeight: 600 }}>{s.title}</b><br /><span className="fine">{fmtDate(s.createdAt)}{s.pointsAwarded ? ` · +${s.pointsAwarded}` : ''}</span>
                    </Link>
                    <SubmissionChip status={s.status} />
                  </li>
                ))}
              </ul>
            ) : <p className="sub">Вы ещё не сдавали заданий.</p>}
          </section>
          <div className="stack">
            <section className="card">
              <p className="label">Бонусные баллы</p>
              {adj.length ? (
                <ul className="list">
                  {adj.map((a) => (
                    <li key={a.id} className="between">
                      <span className="min0">{a.reason}<br /><span className="fine">{fmtDate(a.createdAt)}</span></span>
                      <span className="pts">{a.amount > 0 ? '+' : ''}{fmtNum(a.amount)}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="sub">Куратор начисляет бонусы за мероприятия и помощь программе.</p>}
            </section>
            <section className="card">
              <p className="label">Данные профиля</p>
              <ProfileForm name={u.name} phone={u.phone ?? ''} org={u.org ?? ''} position={u.position ?? ''} orgLabel={seg.orgLabel} posLabel={seg.posLabel} />
            </section>
            <section className="card" id="password">
              <p className="label">Пароль</p>
              {u.passwordTemp ? <Alert tone="warn" icon="lock">Вы вошли по временному паролю от куратора. Задайте свой: в поле «Текущий пароль» введите временный.</Alert> : null}
              <PasswordForm />
            </section>
            <section className="card">
              <p className="label">Нужна помощь</p>
              <p className="sub">Вопрос о заданиях, баллах или наградах можно задать куратору программы. Ответ придёт уведомлением.</p>
              <div><Link className="btn small" href="/help?topic=program"><Icon name="info" size={15} /> Вопрос куратору</Link></div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
