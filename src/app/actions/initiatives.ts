'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { requireAmbassador, requireCurator } from '@/lib/auth';
import { FORMAT_KEYS, INITIATIVE_POINTS, SEGMENT_KEYS, type InitiativeFormat, type Segment } from '@/lib/domain';
import { isMixed, type Person } from '@/lib/initiatives';
import type { FormState } from './auth';

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const int = (fd: FormData, k: string) => {
  const n = Number(String(fd.get(k) ?? '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && String(fd.get(k) ?? '').trim() !== '' ? n : null;
};
const LINK_RE = /^https?:\/\/\S+\.\S+/;

function refresh(id?: number) {
  revalidatePath('/me', 'layout');
  revalidatePath('/curator', 'layout');
  if (id) revalidatePath(`/me/initiatives/${id}`);
}

async function notify(userIds: number[], text: string, href: string) {
  if (!userIds.length) return;
  await db()`insert into notifications (user_id, text, href) select unnest(${db().array(userIds)}::int[]), ${text}, ${href}`;
}

/* ---------- амбассадор: создание ---------- */
export async function createInitiative(_prev: FormState, fd: FormData): Promise<FormState> {
  const u = await requireAmbassador();
  const values = {
    title: str(fd, 'title'),
    format: str(fd, 'format'),
    region: str(fd, 'region') || u.regionId || '',
    audience: str(fd, 'audience'),
    summary: str(fd, 'summary'),
    goal: str(fd, 'goal'),
    roles: str(fd, 'roles'),
    teamSize: str(fd, 'teamSize') || '4',
    sourceId: str(fd, 'sourceId'),
  };
  const lookingFor = fd.getAll('lookingFor').map(String).filter((s): s is Segment => (SEGMENT_KEYS as string[]).includes(s));
  const onSite = fd.get('onSite') === 'on';
  const fail = (error: string): FormState => ({ error, values: { ...values, lookingFor: lookingFor.join(','), onSite: onSite ? 'on' : '' } });

  if (values.title.length < 5) return fail('Назовите инициативу: от пяти символов.');
  if (!FORMAT_KEYS.includes(values.format as InitiativeFormat)) return fail('Выберите формат.');
  if (values.summary.length < 40) return fail('Опишите идею подробнее: что произойдёт и для кого, хотя бы пару предложений.');
  if (values.goal.length < 20) return fail('Опишите ожидаемый результат: что появится, когда проект завершится.');
  if (!lookingFor.length) return fail('Отметьте, кого вы ищете в команду.');
  const teamSize = Math.round(Number(values.teamSize));
  if (!(teamSize >= 2 && teamSize <= 8)) return fail('Размер команды — от 2 до 8 человек вместе с вами.');

  const sql = db();
  const [region] = await sql`select id from regions where id = ${values.region}`;
  if (!region) return fail('Выберите регион.');
  let sourceId: number | null = null;
  if (values.sourceId) {
    const [src] = await sql<{ id: number }[]>`select id from initiatives where id = ${Number(values.sourceId)} and status = 'done'`;
    if (!src) return fail('Исходный формат не найден в библиотеке.');
    sourceId = src.id;
  }

  const id = await sql.begin(async (tx) => {
    const [row] = await tx<{ id: number }[]>`
      insert into initiatives (author_id, source_id, title, format, region_id, audience, summary, goal, looking_for, roles, team_size, on_site)
      values (${u.id}, ${sourceId}, ${values.title.slice(0, 140)}, ${values.format}, ${values.region}, ${values.audience.slice(0, 200)},
              ${values.summary.slice(0, 3000)}, ${values.goal.slice(0, 1500)}, ${tx.array(lookingFor)}, ${values.roles.slice(0, 500)}, ${teamSize}, ${onSite})
      returning id`;
    await tx`insert into initiative_members (initiative_id, user_id, status, decided_at) values (${row.id}, ${u.id}, 'accepted', now())`;
    return row.id;
  });
  refresh();
  redirect(`/me/initiatives/${id}?created=1`);
}

/* ---------- амбассадор: команда ---------- */
export async function requestJoin(_prev: FormState, fd: FormData): Promise<FormState> {
  const u = await requireAmbassador();
  const id = Number(fd.get('id'));
  const note = str(fd, 'note').slice(0, 500);
  const sql = db();
  const [i] = await sql<{ id: number; title: string; status: string; authorId: number; teamSize: number; team: number }[]>`
    select i.id, i.title, i.status, i.author_id, i.team_size,
      (select count(*)::int from initiative_members m where m.initiative_id = i.id and m.status = 'accepted') as team
    from initiatives i where i.id = ${id}`;
  if (!i || !['recruiting', 'active'].includes(i.status)) return { error: 'Набор в эту команду закрыт.' };
  if (i.team >= i.teamSize) return { error: 'Команда уже собрана.' };
  if (note.length < 10) return { error: 'Напишите автору пару слов: чем вы можете помочь проекту.' };
  const [mine] = await sql<{ status: string }[]>`select status from initiative_members where initiative_id = ${id} and user_id = ${u.id}`;
  if (mine?.status === 'accepted') return { error: 'Вы уже в команде.' };
  if (mine?.status === 'requested') return { error: 'Отклик уже у автора.' };
  if (mine?.status === 'declined') return { error: 'Автор уже собрал команду без вас. Посмотрите другие инициативы.' };
  await sql`insert into initiative_members (initiative_id, user_id, note) values (${id}, ${u.id}, ${note})`;
  await notify([i.authorId], `${u.name} хочет в команду «${i.title}»`, `/me/initiatives/${id}`);
  refresh(id);
  return { ok: 'Отклик отправлен автору. Мы сообщим, когда он ответит.' };
}

export async function leaveInitiative(fd: FormData) {
  const u = await requireAmbassador();
  const id = Number(fd.get('id'));
  await db()`delete from initiative_members m using initiatives i
             where m.initiative_id = ${id} and m.user_id = ${u.id} and i.id = m.initiative_id
               and i.author_id <> ${u.id} and i.status in ('idea', 'recruiting', 'active')`;
  refresh(id);
}

export async function decideMember(fd: FormData) {
  const u = await requireAmbassador();
  const id = Number(fd.get('id'));
  const userId = Number(fd.get('userId'));
  const accept = fd.get('decision') === 'accept';
  const sql = db();
  const [i] = await sql<{ title: string; teamSize: number; team: number }[]>`
    select i.title, i.team_size, (select count(*)::int from initiative_members m where m.initiative_id = i.id and m.status = 'accepted') as team
    from initiatives i where i.id = ${id} and i.author_id = ${u.id} and i.status in ('recruiting', 'active')`;
  if (!i) return;
  if (accept && i.team >= i.teamSize) return;
  const upd = await sql`update initiative_members set status = ${accept ? 'accepted' : 'declined'}, decided_at = now()
                        where initiative_id = ${id} and user_id = ${userId} and status = 'requested' returning user_id`;
  if (upd.length) {
    await notify([userId], accept ? `Вас приняли в команду «${i.title}»` : `Автор «${i.title}» собрал команду. Загляните на биржу: там есть другие проекты.`,
      accept ? `/me/initiatives/${id}` : '/me/initiatives');
  }
  refresh(id);
}

export async function startWork(fd: FormData) {
  const u = await requireAmbassador();
  const id = Number(fd.get('id'));
  const sql = db();
  const [i] = await sql<{ title: string }[]>`
    update initiatives set status = 'active', started_at = now()
    where id = ${id} and author_id = ${u.id} and status = 'recruiting'
      and (select count(*) from initiative_members m where m.initiative_id = ${id} and m.status = 'accepted') >= 2
    returning title`;
  if (i) {
    const team = await sql<{ userId: number }[]>`select user_id from initiative_members where initiative_id = ${id} and status = 'accepted' and user_id <> ${u.id}`;
    await notify(team.map((t) => t.userId), `Команда «${i.title}» собрана — проект в работе`, `/me/initiatives/${id}`);
    await sql`update initiative_members set status = 'declined', decided_at = now() where initiative_id = ${id} and status = 'requested'`;
  }
  refresh(id);
}

export async function submitReport(_prev: FormState, fd: FormData): Promise<FormState> {
  const u = await requireAmbassador();
  const id = Number(fd.get('id'));
  const values = { result: str(fd, 'result'), playbook: str(fd, 'playbook'), link: str(fd, 'link'), reach: str(fd, 'reach'), audienceCount: str(fd, 'audienceCount'), audienceScore: str(fd, 'audienceScore') };
  const fail = (error: string): FormState => ({ error, values });
  if (values.result.length < 40) return fail('Расскажите, что получилось: хотя бы пару предложений.');
  if (values.playbook.length < 40) return fail('Опишите, как повторить проект: шаги, ресурсы, на что обратить внимание.');
  if (values.link && !LINK_RE.test(values.link)) return fail('Ссылка должна начинаться с https://');
  const reach = int(fd, 'reach');
  const audienceCount = int(fd, 'audienceCount');
  const score = int(fd, 'audienceScore');
  if (reach !== null && (reach < 0 || reach > 10_000_000)) return fail('Проверьте охват.');
  if (audienceCount !== null && (audienceCount < 0 || audienceCount > 100_000)) return fail('Проверьте число участников.');
  if (score !== null && (score < 1 || score > 5)) return fail('Оценка аудитории — от 1 до 5.');
  const upd = await db()`
    update initiatives set status = 'reporting', reported_at = now(), curator_comment = null,
      result = ${values.result.slice(0, 3000)}, playbook = ${values.playbook.slice(0, 4000)}, result_link = ${values.link || null},
      reach = ${reach === null ? null : Math.round(reach)}, audience_count = ${audienceCount === null ? null : Math.round(audienceCount)},
      audience_score = ${score === null ? null : Math.round(score * 10) / 10}
    where id = ${id} and author_id = ${u.id} and status = 'active' returning id`;
  if (!upd.length) return fail('Итоги можно отправить, пока проект в работе.');
  refresh(id);
  return { ok: 'Итоги у куратора. После проверки команда получит баллы, а проект попадёт в библиотеку форматов.' };
}

/* ---------- куратор ---------- */
export async function approveIdea(fd: FormData) {
  await requireCurator();
  const id = Number(fd.get('id'));
  const [i] = await db()<{ title: string; authorId: number }[]>`
    update initiatives set status = 'recruiting', approved_at = now(), curator_comment = ${str(fd, 'comment') || null}
    where id = ${id} and status = 'idea' returning title, author_id`;
  if (i) await notify([i.authorId], `Инициатива «${i.title}» согласована — открыт набор команды`, `/me/initiatives/${id}`);
  refresh(id);
}

export async function declineIdea(fd: FormData) {
  await requireCurator();
  const id = Number(fd.get('id'));
  const comment = str(fd, 'comment').slice(0, 1000) || 'Давайте обсудим идею: напишите куратору.';
  const [i] = await db()<{ title: string; authorId: number }[]>`
    update initiatives set status = 'declined', curator_comment = ${comment} where id = ${id} and status = 'idea' returning title, author_id`;
  if (i) await notify([i.authorId], `Инициативу «${i.title}» пока не согласовали: ${comment}`, `/me/initiatives/${id}`);
  refresh(id);
}

export async function returnReport(fd: FormData) {
  await requireCurator();
  const id = Number(fd.get('id'));
  const comment = str(fd, 'comment').slice(0, 1000) || 'Дополните итоги и инструкцию для повторения.';
  const [i] = await db()<{ title: string; authorId: number }[]>`
    update initiatives set status = 'active', curator_comment = ${comment} where id = ${id} and status = 'reporting' returning title, author_id`;
  if (i) await notify([i.authorId], `Итоги «${i.title}» вернули на доработку: ${comment}`, `/me/initiatives/${id}`);
  refresh(id);
}

export async function acceptReport(fd: FormData) {
  const c = await requireCurator();
  const id = Number(fd.get('id'));
  await db().begin(async (tx) => {
    const [i] = await tx<{ title: string; authorId: number; regionId: string; sourceId: number | null }[]>`
      update initiatives set status = 'done', done_at = now(), reviewer_id = ${c.id}
      where id = ${id} and status = 'reporting' returning title, author_id, region_id, source_id`;
    if (!i) return;
    const team = await tx<Person[]>`
      select u.id, u.name, u.segment from initiative_members m join users u on u.id = m.user_id
      where m.initiative_id = ${id} and m.status = 'accepted'`;
    const mixed = isMixed(team);
    const award = async (userId: number, amount: number, reason: string, text: string, href: string) => {
      await tx`insert into point_adjustments (user_id, amount, reason, author_id) values (${userId}, ${amount}, ${reason}, ${c.id})`;
      await tx`update users set points = points + ${amount} where id = ${userId}`;
      await tx`insert into notifications (user_id, text, href) values (${userId}, ${text}, ${href})`;
    };
    for (const p of team) {
      const base = p.id === i.authorId ? INITIATIVE_POINTS.author : INITIATIVE_POINTS.member;
      const amount = base + (mixed ? INITIATIVE_POINTS.mixed : 0);
      const role = p.id === i.authorId ? 'авторство' : 'работа в команде';
      await award(p.id, amount, `Инициатива «${i.title}»: ${role}${mixed ? ' + смешанная команда' : ''}`,
        `Инициатива «${i.title}» завершена: +${amount} баллов. Формат появился в библиотеке.`, `/me/initiatives/${id}`);
    }
    if (i.sourceId) {
      const [src] = await tx<{ authorId: number; title: string; regionId: string }[]>`
        select author_id, title, region_id from initiatives where id = ${i.sourceId}`;
      if (src && src.regionId !== i.regionId && !team.some((p) => p.id === src.authorId)) {
        await award(src.authorId, INITIATIVE_POINTS.replicated, `Формат «${src.title}» повторили в другом регионе`,
          `Ваш формат «${src.title}» повторили в другом регионе: +${INITIATIVE_POINTS.replicated} баллов`, `/me/initiatives/${i.sourceId}`);
      }
    }
  });
  refresh(id);
}
