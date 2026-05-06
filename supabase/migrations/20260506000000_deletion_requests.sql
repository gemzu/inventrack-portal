create table if not exists deletion_requests (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid,
  email      text,
  reason     text,
  status     text not null default 'processing',
  created_at timestamptz not null default now()
);

-- Only admins / service role can read this table
alter table deletion_requests enable row level security;

create policy "service role only"
  on deletion_requests
  using (false);
