'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { getUser, type SessionUser } from '@/lib/auth';

type Target = { id: number; userId: number; status: string; flagged: boolean; regionId: string | null; points: number; title: string; taskId: number };

async function loadForReview(submissionId: number): Promise<{ reviewer: SessionUser; role: 'captain' | 'curator'; s: Target } | null> {
  const reviewer = await getUser();
  if (!reviewer) return null;
  const [s] = await db()<Target[]>`
    select s.id, s.user_id, s.status, s.flagged, u.region_id, t.points, t.title, t.id as task_id
    from submissions s join users u on u.id = s.user_id join tasks t on t.id = s.task_id
    where s.id = ${submissionId}`;
  if (!s || s.status !== 'pending') return null;
  if (reviewer.role === 'curator') return { reviewer, role: 'curator', s };
  const canCaptain = reviewer.role === 'ambassador' && reviewer.status === 'active' && reviewer.isCaptain
    && reviewer.regionId === s.regionId && !s.flagged && reviewer.id !== s.userId;
  return canCaptain ? { reviewer, role: 'captain', s } : null;
}

function refresh() {
  revalidatePath('/curator', 'layout');
  revalidatePath('/me', 'layout');
}

export async function approveSubmission(fd: FormData) {
  const ctx = await loadForReview(Number(fd.get('id')));
  if (!ctx) return;
  const { reviewer, role, s } = ctx;
  await db().begin(async (tx) => {
    const upd = await tx`update submissions set status = 'approved', points_awarded = ${s.points}, reviewer_id = ${reviewer.id},
                          reviewer_role = ${role}, reviewed_at = now(), comment = null
                         where id = ${s.id} and status = 'pending' returning id`;
    if (!upd.length) return;
    await tx`update users set points = points + ${s.points} where id = ${s.userId}`;
    await tx`insert into notifications (user_id, text, href)
             values (${s.userId}, ${`Задание «${s.title}» принято: +${s.points} баллов`}, ${`/me/tasks/${s.taskId}`})`;
  });
  refresh();
}

export async function returnSubmission(fd: FormData) {
  const ctx = await loadForReview(Number(fd.get('id')));
  if (!ctx) return;
  const comment = String(fd.get('comment') ?? '').trim().slice(0, 1000) || 'Нужно доработать задание.';
  const { reviewer, role, s } = ctx;
  await db().begin(async (tx) => {
    const upd = await tx`update submissions set status = 'returned', comment = ${comment}, reviewer_id = ${reviewer.id},
                          reviewer_role = ${role}, reviewed_at = now()
                         where id = ${s.id} and status = 'pending' returning id`;
    if (!upd.length) return;
    await tx`insert into notifications (user_id, text, href)
             values (${s.userId}, ${`Задание «${s.title}» вернули на доработку: ${comment}`}, ${`/me/tasks/${s.taskId}`})`;
  });
  refresh();
}
