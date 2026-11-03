'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { requireCurator } from '@/lib/auth';
import { KIND_KEYS, REWARD_CATEGORIES, SEGMENT_KEYS, type Kind, type Segment } from '@/lib/domain';

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const num = (fd: FormData, k: string) => {
  const n = Number(String(fd.get(k) ?? '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n) : 0;
};
const refresh = () => {
  revalidatePath('/curator', 'layout');
  revalidatePath('/me', 'layout');
};

/* ---------- заявки ---------- */
export async function approveApplication(fd: FormData) {
  await requireCurator();
  const id = Number(fd.get('id'));
  const sql = db();
  const upd = await sql`update users set status = 'active', approved_at = now(), last_active_at = now()
                        where id = ${id} and role = 'ambassador' and status = 'pending' returning id`;
  if (upd.length) {
    await sql`insert into notifications (user_id, text, href)
              values (${id}, 'Заявка одобрена — добро пожаловать в программу! Начните с заданий недели.', '/me/tasks')`;
  }
  refresh();
}

export async function rejectApplication(fd: FormData) {
  await requireCurator();
  await db()`update users set status = 'rejected' where id = ${Number(fd.get('id'))} and role = 'ambassador' and status = 'pending'`;
  refresh();
}

/* ---------- амбассадоры ---------- */
export async function setCaptain(fd: FormData) {
  await requireCurator();
  const id = Number(fd.get('id'));
  const value = fd.get('value') === 'true';
  const sql = db();
  const upd = await sql`update users set is_captain = ${value} where id = ${id} and role = 'ambassador' returning id`;
  if (upd.length && value) {
    await sql`insert into notifications (user_id, text, href) values (${id}, 'Вас назначили капитаном региона. Проверяйте задания амбассадоров своего региона.', '/me/review')`;
  }
  refresh();
}

export async function setUserStatus(fd: FormData) {
  await requireCurator();
  const status = str(fd, 'status');
  if (!['active', 'paused'].includes(status)) return;
  await db()`update users set status = ${status} where id = ${Number(fd.get('id'))} and role = 'ambassador' and status in ('active', 'paused')`;
  refresh();
}

export async function setMentor(fd: FormData) {
  await requireCurator();
  const id = Number(fd.get('id'));
  const mentor = Number(fd.get('mentorId')) || null;
  const sql = db();
  if (mentor) {
    const ok = await sql`select id from users where id = ${mentor} and role = 'ambassador' and segment in ('office', 'site')`;
    if (!ok.length) return;
  }
  await sql`update users set mentor_id = ${mentor} where id = ${id} and role = 'ambassador'`;
  if (mentor) {
    await sql`insert into notifications (user_id, text, href) values (${id}, 'У вас появился наставник-тандем. Загляните на главную.', '/me')`;
  }
  refresh();
}

export async function remind(fd: FormData) {
  const c = await requireCurator();
  const id = Number(fd.get('id'));
  const text = str(fd, 'text') || 'Куратор напоминает: на этой неделе есть короткие задания на 5–10 минут. Загляните!';
  await db()`insert into notifications (user_id, text, href) values (${id}, ${`${text} — ${c.name}`}, '/me/tasks')`;
  refresh();
}

export async function addPoints(fd: FormData) {
  const c = await requireCurator();
  const id = Number(fd.get('id'));
  const amount = num(fd, 'amount');
  const reason = str(fd, 'reason');
  if (!amount || Math.abs(amount) > 5000 || !reason) return;
  await db().begin(async (tx) => {
    await tx`insert into point_adjustments (user_id, amount, reason, author_id) values (${id}, ${amount}, ${reason}, ${c.id})`;
    await tx`update users set points = greatest(0, points + ${amount}) where id = ${id}`;
    await tx`insert into notifications (user_id, text, href)
             values (${id}, ${`${amount > 0 ? 'Начислено' : 'Списано'} ${Math.abs(amount)} баллов: ${reason}`}, '/me/profile')`;
  });
  refresh();
}

/* ---------- задания ---------- */
export async function saveTask(fd: FormData) {
  await requireCurator();
  const id = Number(fd.get('id')) || null;
  const title = str(fd, 'title');
  const kind = str(fd, 'kind') as Kind;
  const segments = fd.getAll('segments').map(String).filter((s): s is Segment => (SEGMENT_KEYS as string[]).includes(s));
  const submitTypes = fd.getAll('submitTypes').map(String).filter((s) => ['text', 'link', 'file'].includes(s));
  const steps = str(fd, 'steps').split('\n').map((s) => s.trim()).filter(Boolean);
  const points = Math.max(1, Math.min(1000, num(fd, 'points')));
  const back = id ? `/curator/tasks/${id}` : '/curator/tasks/new';
  if (title.length < 3 || !KIND_KEYS.includes(kind) || !segments.length || !submitTypes.length) {
    redirect(`${back}?err=${encodeURIComponent('Заполните название, тип, аудиторию и способ сдачи.')}`);
  }
  const sql = db();
  const values = {
    title, kind, points, segments, submitTypes, steps,
    duration: str(fd, 'duration'), channel: str(fd, 'channel'), why: str(fd, 'why'),
    joint: fd.get('joint') === 'on', needsCurator: fd.get('needsCurator') === 'on', active: fd.get('active') === 'on',
    sort: num(fd, 'sort'),
  };
  if (id) {
    await sql`update tasks set title = ${values.title}, kind = ${values.kind}, duration = ${values.duration}, points = ${values.points},
      segments = ${sql.array(values.segments)}, channel = ${values.channel}, why = ${values.why}, steps = ${sql.array(values.steps)},
      submit_types = ${sql.array(values.submitTypes)}, joint = ${values.joint}, needs_curator = ${values.needsCurator},
      active = ${values.active}, sort = ${values.sort} where id = ${id}`;
  } else {
    await sql`insert into tasks (title, kind, duration, points, segments, channel, why, steps, submit_types, joint, needs_curator, active, sort)
      values (${values.title}, ${values.kind}, ${values.duration}, ${values.points}, ${sql.array(values.segments)}, ${values.channel}, ${values.why},
              ${sql.array(values.steps)}, ${sql.array(values.submitTypes)}, ${values.joint}, ${values.needsCurator}, ${values.active}, ${values.sort})`;
  }
  refresh();
  redirect('/curator/tasks?ok=1');
}

export async function toggleTask(fd: FormData) {
  await requireCurator();
  await db()`update tasks set active = not active where id = ${Number(fd.get('id'))}`;
  refresh();
}

/* ---------- награды ---------- */
export async function saveReward(fd: FormData) {
  await requireCurator();
  const id = Number(fd.get('id')) || null;
  const title = str(fd, 'title');
  const category = str(fd, 'category');
  const audience = str(fd, 'audience');
  const cost = Math.max(1, num(fd, 'cost'));
  const minLevel = Math.max(1, Math.min(4, num(fd, 'minLevel') || 1));
  const note = str(fd, 'note') || null;
  if (title.length < 3 || !(REWARD_CATEGORIES as readonly string[]).includes(category) || !['all', 'internal', 'external'].includes(audience)) {
    redirect(`/curator/rewards?err=${encodeURIComponent('Проверьте название, категорию и аудиторию награды.')}`);
  }
  const sql = db();
  if (id) {
    await sql`update rewards set title = ${title}, category = ${category}, audience = ${audience}, cost = ${cost}, min_level = ${minLevel}, note = ${note} where id = ${id}`;
  } else {
    await sql`insert into rewards (title, category, audience, cost, min_level, note, sort)
              values (${title}, ${category}, ${audience}, ${cost}, ${minLevel}, ${note}, (select coalesce(max(sort), 0) + 1 from rewards))`;
  }
  refresh();
  redirect('/curator/rewards?ok=1');
}

export async function toggleReward(fd: FormData) {
  await requireCurator();
  await db()`update rewards set active = not active where id = ${Number(fd.get('id'))}`;
  refresh();
}

export async function resolveRedemption(fd: FormData) {
  await requireCurator();
  const id = Number(fd.get('id'));
  const action = str(fd, 'action');
  await db().begin(async (tx) => {
    const [r] = await tx<{ userId: number; cost: number; title: string }[]>`
      select d.user_id, d.cost, w.title from redemptions d join rewards w on w.id = d.reward_id where d.id = ${id} and d.status = 'requested'`;
    if (!r) return;
    if (action === 'fulfill') {
      await tx`update redemptions set status = 'fulfilled', resolved_at = now() where id = ${id}`;
      await tx`insert into notifications (user_id, text, href) values (${r.userId}, ${`Награда «${r.title}» выдана. Поздравляем!`}, '/me/rewards')`;
    } else if (action === 'cancel') {
      await tx`update redemptions set status = 'cancelled', resolved_at = now() where id = ${id}`;
      await tx`update users set spent = greatest(0, spent - ${r.cost}) where id = ${r.userId}`;
      await tx`insert into notifications (user_id, text, href) values (${r.userId}, ${`Заявку на «${r.title}» отменили, баллы вернулись на счёт.`}, '/me/rewards')`;
    }
  });
  refresh();
}

/* ---------- метрики ---------- */
export async function saveMetrics(fd: FormData) {
  await requireCurator();
  const month = str(fd, 'month');
  if (!/^\d{4}-\d{2}$/.test(month)) redirect('/curator/metrics?err=1');
  const v = (k: string) => Math.max(0, num(fd, k));
  await db()`
    insert into metrics (month, reach, interactions, career_visits, applications, hires, referral_candidates, referral_hires, internship_applications, updated_at)
    values (${month}, ${v('reach')}, ${v('interactions')}, ${v('careerVisits')}, ${v('applications')}, ${v('hires')},
            ${v('referralCandidates')}, ${v('referralHires')}, ${v('internshipApplications')}, now())
    on conflict (month) do update set reach = excluded.reach, interactions = excluded.interactions, career_visits = excluded.career_visits,
      applications = excluded.applications, hires = excluded.hires, referral_candidates = excluded.referral_candidates,
      referral_hires = excluded.referral_hires, internship_applications = excluded.internship_applications, is_demo = false, updated_at = now()`;
  refresh();
  redirect(`/curator/metrics?ok=${month}`);
}
