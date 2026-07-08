-- Run this in the Supabase SQL editor

create table if not exists push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  endpoint     text not null unique,
  p256dh       text not null,
  auth_key     text not null,
  user_agent   text,
  created_at   timestamptz default now(),
  last_seen_at timestamptz default now()
);

create index if not exists push_subscriptions_user_id_idx on push_subscriptions(user_id);

alter table push_subscriptions enable row level security;

create policy "users_read_own_push_subscriptions" on push_subscriptions
  for select using (user_id = auth.uid());

create policy "users_insert_own_push_subscriptions" on push_subscriptions
  for insert with check (user_id = auth.uid());

create policy "users_update_own_push_subscriptions" on push_subscriptions
  for update using (user_id = auth.uid());

create policy "users_delete_own_push_subscriptions" on push_subscriptions
  for delete using (user_id = auth.uid());
