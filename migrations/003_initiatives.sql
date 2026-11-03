-- Биржа инициатив: амбассадоры сами предлагают проекты и собирают команды.
-- Завершённые инициативы с инструкцией становятся форматами, которые повторяют в других регионах.

create table initiatives (
  id serial primary key,
  author_id integer not null references users(id) on delete cascade,
  source_id integer references initiatives(id) on delete set null,
  title text not null,
  format text not null check (format in ('interview', 'event', 'excursion', 'content', 'masterclass', 'challenge')),
  region_id text not null references regions(id),
  audience text not null default '',
  summary text not null,
  goal text not null,
  looking_for text[] not null default '{}',
  roles text not null default '',
  team_size integer not null default 4 check (team_size between 2 and 8),
  on_site boolean not null default false,
  status text not null default 'idea'
    check (status in ('idea', 'recruiting', 'active', 'reporting', 'done', 'declined')),
  curator_comment text,
  result text,
  playbook text,
  result_link text,
  reach integer,
  audience_count integer,
  audience_score real check (audience_score between 1 and 5),
  reviewer_id integer references users(id) on delete set null,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  started_at timestamptz,
  reported_at timestamptz,
  done_at timestamptz
);
create index initiatives_status_idx on initiatives (status, created_at);
create index initiatives_region_idx on initiatives (region_id);
create index initiatives_author_idx on initiatives (author_id);
create index initiatives_source_idx on initiatives (source_id);

create table initiative_members (
  initiative_id integer not null references initiatives(id) on delete cascade,
  user_id integer not null references users(id) on delete cascade,
  status text not null default 'requested' check (status in ('requested', 'accepted', 'declined')),
  note text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  primary key (initiative_id, user_id)
);
create index initiative_members_user_idx on initiative_members (user_id, status);

-- Награды без материального стимулирования.
-- Бонусы программы лояльности — это, по сути, оплата участия, а приоритет на практику
-- теперь статус за вклад в сезон, а не товар за баллы. Прошлые заявки сохраняются в истории.
update rewards set active = false
where title in ('1000 бонусов программы лояльности АЗС', 'Приоритет при отборе на практику');

insert into rewards (title, category, cost, min_level, audience, note, sort)
select v.title, v.category, v.cost, v.min_level, v.audience, v.note, (select coalesce(max(sort), 0) from rewards) + v.n
from (values
  (1, 'Презентация вашей инициативы на форуме амбассадоров', 'Признание', 700, 3, 'all', 'для авторов завершённых инициатив'),
  (2, 'Разбор вашего проекта с экспертом по коммуникациям', 'Развитие', 400, 2, 'all', null),
  (3, 'Встреча с командой подбора: как устроен отбор на практику', 'Карьера', 350, 2, 'external', null)
) as v(n, title, category, cost, min_level, audience, note)
-- в пустую базу каталог целиком положит scripts/seed.mjs
where exists (select 1 from rewards)
  and not exists (select 1 from rewards r where r.title = v.title);
