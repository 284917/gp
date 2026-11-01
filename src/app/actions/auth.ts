'use server';

import { redirect } from 'next/navigation';
import { compare, hash } from 'bcryptjs';
import { db } from '@/lib/db';
import { createSession, destroySession } from '@/lib/auth';
import { isSegment } from '@/lib/domain';

export type FormState = { error?: string; ok?: string; values?: Record<string, string> };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();

function safeNext(v: string) {
  return v.startsWith('/') && !v.startsWith('//') ? v : '';
}

export async function login(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, 'email').toLowerCase();
  const password = String(fd.get('password') ?? '');
  const next = safeNext(str(fd, 'next'));
  if (!email || !password) return { error: 'Введите почту и пароль.', values: { email } };
  let u: { id: number; passwordHash: string; role: string } | undefined;
  try {
    const rows = await db()<{ id: number; passwordHash: string; role: string }[]>`
      select id, password_hash, role from users where email = ${email}`;
    u = rows[0];
    if (!u || !(await compare(password, u.passwordHash))) {
      return { error: 'Неверная почта или пароль.', values: { email } };
    }
    await createSession(u.id);
  } catch (err) {
    console.error('[login] ошибка входа', err);
    return { error: `Не удалось войти: ${err instanceof Error ? err.message : String(err)}`, values: { email } };
  }
  const home = u.role === 'curator' ? '/curator' : '/me';
  redirect(next && next.startsWith(home) ? next : home);
}

export async function join(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = {
    name: str(fd, 'name'),
    email: str(fd, 'email').toLowerCase(),
    segment: str(fd, 'segment'),
    region: str(fd, 'region'),
    org: str(fd, 'org'),
    position: str(fd, 'position'),
    phone: str(fd, 'phone'),
    motivation: str(fd, 'motivation'),
  };
  const password = String(fd.get('password') ?? '');
  const fail = (error: string): FormState => ({ error, values });

  if (values.name.length < 3) return fail('Укажите имя и фамилию.');
  if (!EMAIL_RE.test(values.email)) return fail('Проверьте адрес почты.');
  if (password.length < 8) return fail('Пароль должен быть не короче 8 символов.');
  if (!isSegment(values.segment)) return fail('Выберите, кто вы в программе.');
  if (!values.region) return fail('Выберите регион.');
  if (!values.org) return fail('Укажите место работы или учёбы.');
  if (values.motivation.length < 20) return fail('Расскажите в паре предложений, почему вы хотите стать амбассадором.');
  if (fd.get('consent') !== 'on') return fail('Нужно согласие на обработку персональных данных.');

  const sql = db();
  const region = await sql`select id from regions where id = ${values.region}`;
  if (!region.length) return fail('Такого региона нет в программе.');
  const exists = await sql`select id from users where email = ${values.email}`;
  if (exists.length) return fail('Эта почта уже зарегистрирована. Войдите в кабинет.');

  const [row] = await sql<{ id: number }[]>`
    insert into users (email, password_hash, name, role, segment, region_id, status, org, position, phone, motivation)
    values (${values.email}, ${await hash(password, 10)}, ${values.name}, 'ambassador', ${values.segment}, ${values.region},
            'pending', ${values.org}, ${values.position || null}, ${values.phone || null}, ${values.motivation})
    returning id`;
  await createSession(row.id);
  redirect('/status');
}

export async function logout() {
  await destroySession();
  redirect('/');
}
