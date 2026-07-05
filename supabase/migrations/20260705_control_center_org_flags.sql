-- Run this in the Supabase SQL editor

alter table organizations add column if not exists is_trial boolean not null default false;
alter table organizations add column if not exists is_internal_test boolean not null default false;
