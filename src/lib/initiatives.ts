import { db } from './db';
import { pct } from './format';
import { groupOf, type InitiativeFormat, type InitiativeStatus, type MemberStatus, type Segment } from './domain';

export type Person = { id: number; name: string; segment: Segment | null };
export type InitiativeCard = {
  id: number;
  title: string;
  format: InitiativeFormat;
  status: InitiativeStatus;
  regionId: string;
  regionCity: string;
  audience: string;
  summary: string;
  goal: string;
  lookingFor: Segment[];
  roles: string;
  teamSize: number;
  onSite: boolean;
  createdAt: Date;
  doneAt: Date | null;
  authorId: number;
  authorName: string;
  sourceId: number | null;
  sourceCity: string | null;
  team: Person[];
  requests: number;
  replicas: number;
};

const CARD_SELECT = (sql: ReturnType<typeof db>) => sql`
  select i.id, i.title, i.format, i.status, i.region_id, r.city as region_city, i.audience, i.summary, i.goal,
    i.looking_for, i.roles, i.team_size, i.on_site, i.created_at, i.done_at, i.author_id, a.name as author_name,
    i.source_id, sr.city as source_city,
    coalesce((select json_agg(json_build_object('id', u.id, 'name', u.name, 'segment', u.segment) order by (u.id = i.author_id) desc, m.decided_at)
       from initiative_members m join users u on u.id = m.user_id
       where m.initiative_id = i.id and m.status = 'accepted'), '[]'::json) as team,
    (select count(*)::int from initiative_members m where m.initiative_id = i.id and m.status = 'requested') as requests,
    (select count(*)::int from initiatives c where c.source_id = i.id and c.status not in ('idea', 'declined')) as replicas
  from initiatives i
  join users a on a.id = i.author_id
  join regions r on r.id = i.region_id
  left join initiatives s on s.id = i.source_id
  left join regions sr on sr.id = s.region_id`;

/** Карточки биржи. Фильтры собираются из необязательных условий. */
export async function listInitiatives(opts: {
  statuses: InitiativeStatus[];
  regionId?: string | null;
  segment?: Segment | null;
  memberId?: number | null;
  format?: InitiativeFormat | null;
  limit?: number;
}) {
  const sql = db();
  return sql<InitiativeCard[]>`
    ${CARD_SELECT(sql)}
    where i.status = any(${sql.array(opts.statuses)})
      ${opts.regionId ? sql`and i.region_id = ${opts.regionId}` : sql``}
      ${opts.segment ? sql`and ${opts.segment} = any(i.looking_for)` : sql``}
      ${opts.format ? sql`and i.format = ${opts.format}` : sql``}
      ${opts.memberId ? sql`and exists (select 1 from initiative_members m where m.initiative_id = i.id and m.user_id = ${opts.memberId} and m.status <> 'declined')` : sql``}
    order by case i.status when 'recruiting' then 0 when 'active' then 1 when 'reporting' then 2 when 'idea' then 3 when 'done' then 4 else 5 end,
      coalesce(i.done_at, i.created_at) desc
    limit ${opts.limit ?? 60}`;
}

export type MemberRow = Person & { status: MemberStatus; note: string | null; createdAt: Date; org: string | null; position: string | null; regionCity: string | null };
export type InitiativeDetail = InitiativeCard & {
  curatorComment: string | null;
  result: string | null;
  playbook: string | null;
  resultLink: string | null;
  reach: number | null;
  audienceCount: number | null;
  audienceScore: number | null;
  approvedAt: Date | null;
  startedAt: Date | null;
  reportedAt: Date | null;
  members: MemberRow[];
  replicaList: { id: number; title: string; status: InitiativeStatus; regionCity: string }[];
};

export async function getInitiative(id: number): Promise<InitiativeDetail | null> {
  if (!Number.isInteger(id) || id <= 0) return null;
  const sql = db();
  const [card] = await sql<(InitiativeCard & Omit<InitiativeDetail, keyof InitiativeCard | 'members' | 'replicaList'>)[]>`
    select c.*, i.curator_comment, i.result, i.playbook, i.result_link, i.reach, i.audience_count, i.audience_score,
      i.approved_at, i.started_at, i.reported_at
    from (${CARD_SELECT(sql)} where i.id = ${id}) c join initiatives i on i.id = c.id`;
  if (!card) return null;
  const members = await sql<MemberRow[]>`
    select u.id, u.name, u.segment, u.org, u.position, r.city as region_city, m.status, m.note, m.created_at
    from initiative_members m join users u on u.id = m.user_id left join regions r on r.id = u.region_id
    where m.initiative_id = ${id}
    order by (u.id = ${card.authorId}) desc, m.status = 'accepted' desc, m.created_at`;
  const replicaList = await sql<InitiativeDetail['replicaList']>`
    select i.id, i.title, i.status, r.city as region_city from initiatives i join regions r on r.id = i.region_id
    where i.source_id = ${id} and i.status not in ('idea', 'declined') order by i.created_at`;
  return { ...card, members, replicaList };
}

/** Смешанная команда: в ней есть и сотрудники, и студенты. */
export const isMixed = (team: Person[]) => {
  const groups = new Set(team.map((p) => groupOf(p.segment)));
  return groups.has('internal') && groups.has('external');
};

/** Показатели самостоятельности сообщества для кабинета куратора. */
export async function getCommunityStats() {
  const sql = db();
  const [row] = await sql<{
    active: number; initiators: number; done: number; mixed: number; replicated: number;
    base: number; retained: number; idea: number; recruiting: number; working: number; reporting: number;
    members: number; replicas: number;
  }[]>`
    with done as (select * from initiatives where status = 'done'),
    base as (
      select u.id from users u
      where u.role = 'ambassador' and u.status in ('active', 'paused') and u.approved_at < now() - interval '60 days'
    )
    select
      (select count(*)::int from users where role = 'ambassador' and status = 'active') as active,
      (select count(distinct d.author_id)::int from done d join users u on u.id = d.author_id where u.status = 'active') as initiators,
      (select count(*)::int from done) as done,
      (select count(*)::int from done d where
         exists (select 1 from initiative_members m join users u on u.id = m.user_id
                 where m.initiative_id = d.id and m.status = 'accepted' and u.segment in ('office', 'site'))
         and exists (select 1 from initiative_members m join users u on u.id = m.user_id
                 where m.initiative_id = d.id and m.status = 'accepted' and u.segment in ('uni', 'college'))) as mixed,
      (select count(*)::int from done d where exists (
         select 1 from initiatives c where c.source_id = d.id and c.region_id <> d.region_id and c.status not in ('idea', 'declined'))) as replicated,
      (select count(*)::int from base) as base,
      (select count(*)::int from base b join users u on u.id = b.id where u.status = 'active' and (
         exists (select 1 from submissions s where s.user_id = b.id and s.created_at > now() - interval '30 days')
         or exists (select 1 from initiative_members m join initiatives i on i.id = m.initiative_id
                    where m.user_id = b.id and m.status = 'accepted'
                      and (i.status in ('recruiting', 'active', 'reporting') or i.done_at > now() - interval '30 days')))) as retained,
      (select count(*)::int from initiatives where status = 'idea') as idea,
      (select count(*)::int from initiatives where status = 'recruiting') as recruiting,
      (select count(*)::int from initiatives where status = 'active') as working,
      (select count(*)::int from initiatives where status = 'reporting') as reporting,
      (select count(distinct m.user_id)::int from initiative_members m join initiatives i on i.id = m.initiative_id
         where m.status = 'accepted' and i.status not in ('idea', 'declined')) as members,
      (select count(*)::int from initiatives where source_id is not null and status not in ('idea', 'declined')) as replicas`;
  const flows = await sql<{ fromCity: string; toCity: string; fromId: string; toId: string }[]>`
    select sr.city as from_city, r.city as to_city, sr.id as from_id, r.id as to_id
    from initiatives i join initiatives s on s.id = i.source_id
    join regions r on r.id = i.region_id join regions sr on sr.id = s.region_id
    where i.status not in ('idea', 'declined') and i.region_id <> s.region_id
    order by i.created_at desc limit 12`;
  return {
    ...row,
    index: pct(row.initiators, row.active),
    mixedShare: pct(row.mixed, row.done),
    replicatedShare: pct(row.replicated, row.done),
    retention: pct(row.retained, row.base),
    flows,
  };
}
