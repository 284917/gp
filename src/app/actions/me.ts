'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { compare, hash } from 'bcryptjs';
import { db } from '@/lib/db';
import { requireAmbassador, requireMember, requireUser } from '@/lib/auth';
import { groupOf, levelOf } from '@/lib/domain';
import type { FormState } from './auth';

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const BLOB_HOST = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i;

export async function submitTask(_prev: FormState, fd: FormData): Promise<FormState> {
  const u = await requireAmbassador();
  const taskId = Number(fd.get('taskId'));
  const body = str(fd, 'body');
  const link = str(fd, 'link');
  const fileUrl = str(fd, 'fileUrl');
  const fileName = str(fd, 'fileName');
  const sql = db();

  const [task] = await sql<{ id: number; title: string; active: boolean; segments: string[]; needsCurator: boolean; submitTypes: string[] }[]>`
    select id, title, active, segments, needs_curator, submit_types from tasks where id = ${taskId}`;
  if (!task || !task.active || !u.segment || !task.segments.includes(u.segment)) return { error: 'Это задание сейчас недоступно.' };

  const [last] = await sql<{ status: string }[]>`
    select status from submissions where user_id = ${u.id} and task_id = ${taskId} order by created_at desc limit 1`;
  if (last?.status === 'pending') return { error: 'Задание уже на проверке.' };
  if (last?.status === 'approved') return { error: 'Задание уже выполнено.' };

  if (!body && !link && !fileUrl) return { error: 'Добавьте текст, ссылку или файл.' };
  if (body.length > 5000) return { error: 'Текст слишком длинный: максимум 5000 знаков.' };
  if (link && !/^https?:\/\/\S+\.\S+/.test(link)) return { error: 'Ссылка должна начинаться с https://' };
  if (fileUrl && !BLOB_HOST.test(fileUrl)) return { error: 'Файл не загрузился. Попробуйте ещё раз.' };

  await sql.begin(async (tx) => {
    await tx`insert into submissions (user_id, task_id, body, link, file_url, file_name, flagged)
             values (${u.id}, ${taskId}, ${body || null}, ${link || null}, ${fileUrl || null}, ${fileName || null}, ${task.needsCurator})`;
    await tx`update users set last_active_at = now() where id = ${u.id}`;
    if (!task.needsCurator && u.regionId) {
      await tx`insert into notifications (user_id, text, href)
               select id, ${`${u.name} сдал(а) задание «${task.title}» — нужна проверка`}, '/me/review'
               from users where role = 'ambassador' and status = 'active' and is_captain and region_id = ${u.regionId} and id <> ${u.id}`;
    }
  });
  revalidatePath('/me', 'layout');
  redirect(`/me/tasks/${taskId}?sent=1`);
}

export async function redeemReward(fd: FormData) {
  const u = await requireAmbassador();
  const rewardId = Number(fd.get('rewardId'));
  const sql = db();
  const [r] = await sql<{ id: number; title: string; cost: number; minLevel: number; audience: string; active: boolean }[]>`
    select id, title, cost, min_level, audience, active from rewards where id = ${rewardId}`;
  const back = (m: string) => `/me/rewards?err=${encodeURIComponent(m)}`;
  if (!r || !r.active) redirect(back('Эта награда больше недоступна.'));
  if (r.audience !== 'all' && r.audience !== groupOf(u.segment)) redirect(back('Эта награда не для вашей роли.'));
  if (levelOf(u.points).n < r.minLevel) redirect(back('Награда откроется на следующем уровне.'));
  const dup = await sql`select id from redemptions where user_id = ${u.id} and reward_id = ${r.id} and status = 'requested'`;
  if (dup.length) redirect(back('Заявка на эту награду уже у куратора.'));

  const ok = await sql.begin(async (tx) => {
    const upd = await tx`update users set spent = spent + ${r.cost} where id = ${u.id} and points - spent >= ${r.cost} returning id`;
    if (!upd.length) return false;
    await tx`insert into redemptions (user_id, reward_id, cost) values (${u.id}, ${r.id}, ${r.cost})`;
    return true;
  });
  if (!ok) redirect(back('Не хватает баллов.'));
  revalidatePath('/me', 'layout');
  revalidatePath('/curator', 'layout');
  redirect(`/me/rewards?ok=${encodeURIComponent(`Заявка на «${r.title}» отправлена куратору`)}`);
}

export async function updateProfile(_prev: FormState, fd: FormData): Promise<FormState> {
  const u = await requireMember();
  const name = str(fd, 'name');
  if (name.length < 3) return { error: 'Укажите имя и фамилию.' };
  await db()`update users set name = ${name}, phone = ${str(fd, 'phone') || null}, org = ${str(fd, 'org') || null}, position = ${str(fd, 'position') || null}
             where id = ${u.id}`;
  revalidatePath('/me', 'layout');
  return { ok: 'Профиль сохранён.' };
}

export async function changePassword(_prev: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  const current = String(fd.get('current') ?? '');
  const next = String(fd.get('next') ?? '');
  if (next.length < 8) return { error: 'Новый пароль должен быть не короче 8 символов.' };
  const sql = db();
  const [row] = await sql<{ passwordHash: string }[]>`select password_hash from users where id = ${u.id}`;
  if (!row || !(await compare(current, row.passwordHash))) return { error: 'Текущий пароль указан неверно.' };
  await sql`update users set password_hash = ${await hash(next, 10)} where id = ${u.id}`;
  return { ok: 'Пароль изменён.' };
}

export async function markNotificationsRead() {
  const u = await requireMember();
  await db()`update notifications set read = true where user_id = ${u.id} and not read`;
  revalidatePath('/me', 'layout');
}
