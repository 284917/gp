import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignJWT, jwtVerify } from 'jose';
import { createHash } from 'node:crypto';
import { cache } from 'react';
import { db, dbUrl } from './db';
import type { Segment, UserStatus } from './domain';

export const SESSION_COOKIE = 'golos_session';

export type SessionUser = {
  id: number;
  email: string;
  name: string;
  role: 'ambassador' | 'curator';
  curatorScope: 'internal' | 'external' | 'all' | null;
  segment: Segment | null;
  regionId: string | null;
  regionCity: string | null;
  regionName: string | null;
  status: UserStatus;
  isCaptain: boolean;
  points: number;
  spent: number;
  org: string | null;
  position: string | null;
  phone: string | null;
  motivation: string | null;
  mentorId: number | null;
  isDemo: boolean;
  createdAt: Date;
  lastActiveAt: Date | null;
};

function secretKey() {
  const raw = process.env.AUTH_SECRET || createHash('sha256').update(`golos:${dbUrl() ?? 'local-dev'}`).digest('hex');
  return new TextEncoder().encode(raw);
}

export async function createSession(userId: number) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secretKey());
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export const getUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  let id: number;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    id = Number(payload.sub);
  } catch {
    return null;
  }
  if (!Number.isInteger(id)) return null;
  const rows = await db()<SessionUser[]>`
    select u.id, u.email, u.name, u.role, u.curator_scope, u.segment, u.region_id, u.status, u.is_captain,
           u.points, u.spent, u.org, u.position, u.phone, u.motivation, u.mentor_id, u.is_demo, u.created_at, u.last_active_at,
           r.city as region_city, r.name as region_name
    from users u left join regions r on r.id = u.region_id
    where u.id = ${id}`;
  return rows[0] ?? null;
});

export async function requireUser() {
  const u = await getUser();
  if (!u) redirect('/login');
  return u;
}

export async function requireCurator() {
  const u = await getUser();
  if (!u) redirect('/login?next=/curator');
  if (u.role !== 'curator') redirect('/me');
  return u;
}

/** Амбассадор в любом статусе (для экрана статуса заявки). */
export async function requireMember() {
  const u = await getUser();
  if (!u) redirect('/login?next=/me');
  if (u.role === 'curator') redirect('/curator');
  return u;
}

/** Активный амбассадор. Заодно отмечает активность раз в полчаса. */
export async function requireAmbassador() {
  const u = await requireMember();
  if (u.status !== 'active') redirect('/status');
  if (!u.lastActiveAt || Date.now() - new Date(u.lastActiveAt).getTime() > 30 * 60_000) {
    await db()`update users set last_active_at = now() where id = ${u.id}`;
  }
  return u;
}

export const blobEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
