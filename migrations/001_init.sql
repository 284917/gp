-- Голос компании: начальная схема

create table regions (
  id text primary key,
  name text not null,
  city text not null,
  lon double precision not null,
  lat double precision not null,
  tz integer not null default 0,
  sort integer not null default 0
);

create table users (
  id serial primary key,
  email text not null unique,
  password_hash text not null,
  name text not null,
  role text not null check (role in ('ambassador', 'curator')),
  curator_scope text check (curator_scope in ('internal', 'external', 'all')),
  segment text check (segment in ('office', 'site', 'uni', 'college')),
  region_id text references regions(id),
  status text not null default 'pending' check (status in ('pending', 'active', 'paused', 'rejected')),
  is_captain boolean not null default false,
  points integer not null default 0,
  spent integer not null default 0,
  org text,
  position text,
  phone text,
  motivation text,
  mentor_id integer references users(id) on delete set null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  last_active_at timestamptz
);
create index users_role_status_idx on users (role, status);
create index users_region_idx on users (region_id);
create index users_mentor_idx on users (mentor_id);

create table tasks (
  id serial primary key,
  title text not null,
  kind text not null check (kind in ('photo', 'voice', 'video', 'post', 'event', 'link')),
  duration text not null default '',
  points integer not null check (points > 0),
  segments text[] not null,
  channel text not null default '',
  why text not null default '',
  steps text[] not null default '{}',
  submit_types text[] not null default '{text}',
  joint boolean not null default false,
  needs_curator boolean not null default false,
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create table submissions (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  task_id integer not null references tasks(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'returned')),
  body text,
  link text,
  file_url text,
  file_name text,
  flagged boolean not null default false,
  comment text,
  reviewer_id integer references users(id) on delete set null,
  reviewer_role text check (reviewer_role in ('captain', 'curator')),
  points_awarded integer not null default 0,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index submissions_status_idx on submissions (status, created_at);
create index submissions_user_idx on submissions (user_id, created_at);
create index submissions_task_idx on submissions (task_id);

create table point_adjustments (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  amount integer not null,
  reason text not null,
  author_id integer references users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index point_adjustments_user_idx on point_adjustments (user_id);

create table rewards (
  id serial primary key,
  title text not null,
  category text not null,
  cost integer not null check (cost > 0),
  min_level integer not null default 1,
  audience text not null default 'all' check (audience in ('all', 'internal', 'external')),
  note text,
  active boolean not null default true,
  sort integer not null default 0
);

create table redemptions (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  reward_id integer not null references rewards(id) on delete cascade,
  cost integer not null,
  status text not null default 'requested' check (status in ('requested', 'fulfilled', 'cancelled')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index redemptions_status_idx on redemptions (status);
create index redemptions_user_idx on redemptions (user_id);

create table notifications (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  text text not null,
  href text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on notifications (user_id, read, created_at);

create table metrics (
  month text primary key,
  reach integer not null default 0,
  interactions integer not null default 0,
  career_visits integer not null default 0,
  applications integer not null default 0,
  hires integer not null default 0,
  referral_candidates integer not null default 0,
  referral_hires integer not null default 0,
  internship_applications integer not null default 0,
  updated_at timestamptz not null default now()
);
