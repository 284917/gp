import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAmbassador } from '@/lib/auth';
import { db } from '@/lib/db';
import { SEGMENTS, WEEK_GOAL, groupOf, levelProgress, type Kind } from '@/lib/domain';
import { plural, timeAgo } from '@/lib/format';
import { listInitiatives } from '@/lib/initiatives';
import { FormatIcon, InitiativeChip } from '@/components/Initiative';
import { Avatar, KindIcon, LevelCard, SeasonStrip } from '@/components/ui';
import { Icon } from '@/components/Icon';

export const metadata: Metadata = { title: 'Мой путь' };

const WEEK_START = `date_trunc('week', now() at time zone 'Europe/Moscow') at time zone 'Europe/Moscow'`;

export default async function MePage() {
  const u = await requireAmbassador();
  const sql = db();
  const group = groupOf(u.segment);

  const [week] = await sql<{ done: number; pending: number }[]>`
    select count(*) filter (where status = 'approved')::int as done, count(*) filter (where status = 'pending')::int as pending
    from submissions where user_id = ${u.id} and status in ('approved', 'pending') and created_at >= ${sql.unsafe(WEEK_START)}`;

  const mentor = u.mentorId
    ? (await sql<{ name: string; segment: string; org: string | null; position: string | null }[]>`
        select name, segment, org, position from users where id = ${u.mentorId}`)[0]
    : null;
  const students = group === 'internal'
    ? await sql<{ name: string; segment: string; org: string | null; position: string | null }[]>`
        select name, segment, org, position from users where mentor_id = ${u.id} and status = 'active' order by name limit 4`
    : [];

  const open = await sql<{ id: number; title: string; kind: Kind; points: number; duration: string }[]>`
    select t.id, t.title, t.kind, t.points, t.duration from tasks t
    where t.active and ${u.segment} = any(t.segments)
      and not exists (select 1 from submissions s where s.task_id = t.id and s.user_id = ${u.id} and s.status in ('pending', 'approved'))
    order by t.sort, t.id limit 3`;

  const notes = await sql<{ id: number; text: string; href: string | null; read: boolean; createdAt: Date }[]>`
    select id, text, href, read, created_at from notifications where user_id = ${u.id} order by created_at desc limit 3`;

  const mine = (await listInitiatives({ statuses: ['idea', 'recruiting', 'active', 'reporting'], memberId: u.id, limit: 3 }));
  const [{ calling }] = await sql<{ calling: number }[]>`
    select count(*)::int as calling from initiatives i
    where i.status = 'recruiting' and ${u.segment} = any(i.looking_for)
      and not exists (select 1 from initiative_members m where m.initiative_id = i.id and m.user_id = ${u.id})`;

  const { lv, nx } = levelProgress(u.points, u);
  const filled = Math.min(WEEK_GOAL, week.done + week.pending);
  const tandemPeople = mentor ? [mentor] : students;

  return (
    <div className="stack" style={{ '--gap': '20px' } as React.CSSProperties}>
      <header className="between">
        <div className="stack" style={{ '--gap': '4px' } as React.CSSProperties}>
          <p className="eyebrow">{u.segment ? SEGMENTS[u.segment].long : 'Амбассадор'} · {u.regionCity}{u.isCaptain ? ' · капитан региона' : ''}</p>
          <h1 className="h1">Привет, {u.name.split(' ')[0]}</h1>
        </div>
        <Link href="/me/tasks" className="btn primary">К заданиям <Icon name="arrow" size={16} /></Link>
      </header>

      <div className="grid-main">
        <div className="stack">
          <LevelCard points={u.points} track={u} />

          <section className="card">
            <div className="between">
              <div>
                <p className="label">Цель недели</p>
                <p className="big">{week.done} из {WEEK_GOAL} заданий{week.pending ? <span className="sub" style={{ fontWeight: 500 }}> · {week.pending} на проверке</span> : null}</p>
              </div>
              <span className="chip">{filled >= WEEK_GOAL ? 'неделя закрыта' : 'новые задания по понедельникам'}</span>
            </div>
            <div className="pips" aria-hidden="true">
              {Array.from({ length: WEEK_GOAL }, (_, i) => <span key={i} className={i < week.done ? 'on' : i < filled ? 'half' : ''} />)}
            </div>
            {open.length ? (
              <div className="tlist">
                {open.map((t) => (
                  <Link key={t.id} href={`/me/tasks/${t.id}`} className="task">
                    <KindIcon kind={t.kind} />
                    <span className="task-body"><span className="task-title">{t.title}</span><span className="meta"><Icon name="clock" size={14} /> {t.duration}</span></span>
                    <span className="pts">+{t.points}</span>
                  </Link>
                ))}
              </div>
            ) : <p className="sub">Все задания недели сданы. Отличная работа!</p>}
          </section>

          <section className="card">
            <div className="between"><p className="label">Сезон</p><span className="fine">сентябрь — май</span></div>
            <SeasonStrip />
          </section>
        </div>

        <div className="stack">
          <section className="card ini-card" data-reveal>
            <div className="between">
              <p className="label">Мои инициативы</p>
              <Link className="link" href="/me/initiatives" style={{ fontSize: 13 }}>Биржа</Link>
            </div>
            {mine.length ? (
              <ul className="list">
                {mine.map((i) => (
                  <li key={i.id}>
                    <Link href={`/me/initiatives/${i.id}`} className="ini-row">
                      <FormatIcon format={i.format} size="sm" />
                      <span className="min0 grow"><b>{i.title}</b><br /><span className="fine">{i.authorId === u.id ? 'вы автор' : `автор ${i.authorName.split(' ')[0]}`} · {i.team.length} в команде</span></span>
                      <InitiativeChip status={i.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="sub">Предложите свой проект или присоединитесь к команде: сотрудники и студенты делают его вместе.</p>}
            {calling ? (
              <Link href="/me/initiatives?view=me" className="calling">
                <i className="live" aria-hidden="true" />
                <span className="grow"><b>{calling}</b> {plural(calling, 'команда ищет', 'команды ищут', 'команд ищут')} {u.segment ? SEGMENTS[u.segment].label.toLowerCase() : 'участников'}</span>
                <Icon name="arrow" size={16} />
              </Link>
            ) : (
              <Link href="/me/initiatives/new" className="btn small"><Icon name="idea" size={16} /> Предложить инициативу</Link>
            )}
          </section>

          <section className="card">
            <div className="between">
              <p className="label">Мой тандем</p>
              <span className="chip good"><Icon name="tandem" size={13} /> {group === 'internal' ? 'наставник студентов' : 'студент + наставник'}</span>
            </div>
            {tandemPeople.length ? (
              <>
                <div className="row" style={{ '--gap': '12px', flexWrap: 'nowrap' } as React.CSSProperties}>
                  <span className="pair">{tandemPeople.map((p, i) => <Avatar key={p.name} name={p.name} className={i ? 'soft alt' : 'soft'} />)}</span>
                  <div className="min0">
                    <p><b>{tandemPeople.map((p) => p.name.split(' ')[0]).join(', ')}</b></p>
                    <p className="sub">{mentor ? `${mentor.position ?? ''}${mentor.org ? `, ${mentor.org}` : ''}` : `${students.length} ${students.length === 1 ? 'студент' : 'студента'} в вашем тандеме`}</p>
                  </div>
                </div>
                <p className="swap">{group === 'internal'
                  ? 'Студенты помогают со съёмкой и монтажом, вы рассказываете о профессии и карьере.'
                  : 'Вы помогаете наставнику с соцсетями, наставник вам — с выбором практики.'}</p>
              </>
            ) : <p className="sub">Куратор подберёт вам {group === 'internal' ? 'студентов для тандема' : 'наставника'} в ближайшее время.</p>}
          </section>

          <section className="card">
            <div className="between"><p className="label">Уведомления</p><Link className="link" href="/me/notifications" style={{ fontSize: 13 }}>Все</Link></div>
            {notes.length ? (
              <ul className="list">
                {notes.map((n) => (
                  <li key={n.id}>
                    <Link href={n.href ?? '/me/notifications'} className="notif">
                      <span className={`dot ${n.read ? 'read' : ''}`} />
                      <span className="min0"><span style={{ fontSize: 14 }}>{n.text}</span><br /><span className="fine">{timeAgo(n.createdAt)}</span></span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="sub">Пока тихо.</p>}
          </section>

          <section className="card">
            <p className="label">{nx ? `Откроется на уровне «${nx.name}»` : 'Вам доступно всё'}</p>
            <ul className="ticks">
              {(nx ?? lv).unlocks.map((x) => <li key={x}><Icon name={nx ? 'lock' : 'check'} size={17} /><span>{x}</span></li>)}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
