-- Run this in the Supabase SQL editor
-- Tracks exactly when both signatures were captured and the inspection was marked completed.
alter table inspections add column if not exists completed_at timestamptz;
