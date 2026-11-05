-- 1. Временный пароль: куратор сбрасывает пароль участника, при входе тот задаёт свой.
alter table users add column if not exists password_temp boolean not null default false;

-- 2. Вопросы куратору: форма на сайте вместо «напишите куратору» без адреса.
create table if not exists questions (
  id serial primary key,
  user_id integer references users(id) on delete set null,
  name text not null,
  email text not null,
  topic text not null check (topic in ('access', 'application', 'program', 'other')),
  body text not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  reply text,
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  answered_by integer references users(id) on delete set null
);
create index if not exists questions_status_idx on questions (status, created_at desc);
create index if not exists questions_email_idx on questions (lower(email), created_at desc);

-- 3. Демо-данные под правила уровней: «Эксперт» — 600 баллов и участие в завершённой инициативе.
-- Демо-участники с 600+ баллами без такого участия входят в команду завершённого проекта своего региона.
-- Касается только демо-аккаунтов (is_demo); баллы не меняются.
insert into initiative_members (initiative_id, user_id, status, created_at, decided_at)
select pick.id, u.id, 'accepted', pick.created_at, pick.created_at
from users u
cross join lateral (
  select i.id, i.created_at
  from initiatives i
  where i.status = 'done' and i.region_id = u.region_id and i.author_id <> u.id
  order by hashtext(i.id::text || ':' || u.id::text)
  limit 1
) pick
where u.is_demo and u.role = 'ambassador' and u.status = 'active' and u.points >= 600
  and not exists (
    select 1 from initiatives d
    where d.status = 'done'
      and (d.author_id = u.id or exists (
        select 1 from initiative_members m where m.initiative_id = d.id and m.user_id = u.id and m.status = 'accepted')))
on conflict (initiative_id, user_id) do update
  set status = 'accepted', decided_at = coalesce(initiative_members.decided_at, excluded.decided_at);
