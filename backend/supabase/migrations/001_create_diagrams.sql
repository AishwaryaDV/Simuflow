-- diagrams table + RLS policies + updated_at trigger

create table if not exists diagrams (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  name        text        not null default 'Untitled',
  topology    jsonb       not null,
  is_public   boolean     not null default false,
  share_token text        unique,
  fork_count  integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- updated_at trigger
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger diagrams_updated_at
  before update on diagrams
  for each row execute function set_updated_at();

-- RLS
alter table diagrams enable row level security;

create policy "users can read own diagrams and public diagrams"
  on diagrams for select
  using (user_id = auth.uid() or is_public = true);

create policy "users can insert own diagrams"
  on diagrams for insert
  with check (user_id = auth.uid());

create policy "users can update own diagrams"
  on diagrams for update
  using (user_id = auth.uid());

create policy "users can delete own diagrams"
  on diagrams for delete
  using (user_id = auth.uid());
