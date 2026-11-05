'use server';

import { randomInt } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { hash } from 'bcryptjs';
import { db } from '@/lib/db';
import { getUser, requireCurator } from '@/lib/auth';
import { QUESTION_TOPICS, isQuestionTopic } from '@/lib/support';
import type { FormState } from './auth';

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Временный пароль без похожих символов (0/O, 1/l): его диктуют или пересылают вручную. */
function tempPassword() {
  const abc = 'abcdefghjkmnpqrstuvwxyz23456789';
  const part = () => Array.from({ length: 4 }, () => abc[randomInt(abc.length)]).join('');
  return `${part()}-${part()}-${part()}`;
}

export type ResetState = { error?: string; password?: string; email?: string };

/** Куратор сбрасывает пароль участника: пароль показывается один раз, при входе участник задаёт свой. */
export async function resetPassword(_prev: ResetState, fd: FormData): Promise<ResetState> {
  const c = await requireCurator();
  const id = Number(fd.get('id'));
  const password = tempPassword();
  const sql = db();
  const [u] = await sql<{ email: string }[]>`
    update users set password_hash = ${await hash(password, 10)}, password_temp = true
    where id = ${id} and role = 'ambassador' returning email`;
  if (!u) return { error: 'Участник не найден.' };
  await sql`insert into notifications (user_id, text, href)
            values (${id}, 'Куратор выдал временный пароль. Задайте свой пароль в профиле.', '/me/profile#password')`;
  // вопросы «не могу войти» от этого человека закрываются сами
  await sql`update questions set status = 'closed', answered_at = now(), answered_by = ${c.id},
              reply = coalesce(reply, 'Куратор выдал временный пароль.')
            where status = 'open' and topic = 'access' and (user_id = ${id} or lower(email) = ${u.email.toLowerCase()})`;
  revalidatePath('/curator', 'layout');
  return { password, email: u.email };
}

/** Вопрос куратору с сайта: доступен и без входа (например, если забыт пароль). */
export async function askCurator(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await getUser().catch(() => null);
  const values = {
    name: user?.name ?? str(fd, 'name'),
    email: (user?.email ?? str(fd, 'email')).toLowerCase(),
    topic: str(fd, 'topic'),
    body: str(fd, 'body'),
  };
  // поле-ловушка для ботов: человек его не видит и не заполняет
  if (str(fd, 'website')) return { ok: 'Вопрос отправлен.' };
  if (values.name.length < 2) return { error: 'Как к вам обращаться?', values };
  if (!EMAIL_RE.test(values.email)) return { error: 'Проверьте почту: на неё придёт ответ.', values };
  const topic = values.topic;
  if (!isQuestionTopic(topic)) return { error: 'Выберите тему вопроса.', values };
  if (values.body.length < 10) return { error: 'Опишите вопрос хотя бы одним предложением.', values };
  if (values.body.length > 3000) return { error: 'Слишком длинный текст: максимум 3000 знаков.', values };

  const sql = db();
  const [{ recent }] = await sql<{ recent: number }[]>`
    select count(*)::int as recent from questions where lower(email) = ${values.email} and created_at > now() - interval '1 day'`;
  if (recent >= 5) return { error: 'Вы уже отправили несколько вопросов сегодня. Куратор ответит на них в ближайшие дни.', values };

  await sql`insert into questions (user_id, name, email, topic, body)
            values (${user?.id ?? null}, ${values.name.slice(0, 120)}, ${values.email}, ${topic}, ${values.body})`;
  revalidatePath('/curator', 'layout');
  const where = user && user.role === 'ambassador'
    ? (user.status === 'active' ? 'уведомлением в кабинете' : 'на этой странице, в разделе «Мои вопросы»')
    : `на почту ${values.email}`;
  return { ok: `Вопрос отправлен. Куратор ответит ${where} в течение пары рабочих дней. Тема: «${QUESTION_TOPICS[topic]}».` };
}

/** Ответ куратора: участнику с кабинетом приходит уведомление, вопрос закрывается. */
export async function answerQuestion(fd: FormData) {
  const c = await requireCurator();
  const id = Number(fd.get('id'));
  const reply = str(fd, 'reply').slice(0, 2000);
  const sql = db();
  const [q] = await sql<{ userId: number | null; email: string }[]>`
    update questions set status = 'closed', reply = ${reply || null}, answered_at = now(), answered_by = ${c.id}
    where id = ${id} returning user_id, email`;
  if (q && reply) {
    await sql`insert into notifications (user_id, text, href)
              select u.id, ${`Ответ куратора: ${reply}`}, '/help'
              from users u where u.id = ${q.userId} or (${q.userId}::int is null and lower(u.email) = lower(${q.email}))
              limit 1`;
  }
  revalidatePath('/curator', 'layout');
}

export async function reopenQuestion(fd: FormData) {
  await requireCurator();
  await db()`update questions set status = 'open' where id = ${Number(fd.get('id'))}`;
  revalidatePath('/curator', 'layout');
}
