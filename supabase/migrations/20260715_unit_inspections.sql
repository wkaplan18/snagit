-- Run this in the Supabase SQL editor
-- Unit inspection feature: tenants, checklist templates, inspections, inspection items.

create table if not exists tenants (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid references organizations(id) on delete cascade not null,
  unit_id           uuid references units(id) on delete cascade not null,
  full_name         text not null,
  email             text,
  phone             text,
  whatsapp          text,
  lease_start_date  date not null,
  lease_end_date    date,
  move_out_date     date,
  status            text not null default 'active', -- 'active' | 'ended'
  notes             text,
  created_by        uuid references auth.users(id),
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create index if not exists tenants_org_id_idx on tenants(org_id);
create index if not exists tenants_unit_id_idx on tenants(unit_id);

alter table tenants enable row level security;

create policy "org_members_read_tenants" on tenants
  for select using (
    org_id in (select org_id from org_members where user_id = auth.uid())
  );

create policy "org_members_insert_tenants" on tenants
  for insert with check (
    org_id in (select org_id from org_members where user_id = auth.uid() and role != 'viewer')
  );

create policy "org_members_update_tenants" on tenants
  for update using (
    org_id in (select org_id from org_members where user_id = auth.uid() and role != 'viewer')
  );

-- Checklist templates (org-admin authored)

create table if not exists inspection_templates (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid references organizations(id) on delete cascade not null,
  name       text not null,
  unit_type  text, -- nullable: null = applies to all unit types
  is_active  boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists inspection_templates_org_id_idx on inspection_templates(org_id);

alter table inspection_templates enable row level security;

create policy "org_members_read_inspection_templates" on inspection_templates
  for select using (
    org_id in (select org_id from org_members where user_id = auth.uid())
  );

create policy "org_admins_insert_inspection_templates" on inspection_templates
  for insert with check (
    org_id in (select org_id from org_members where user_id = auth.uid() and role in ('owner', 'admin'))
  );

create policy "org_admins_update_inspection_templates" on inspection_templates
  for update using (
    org_id in (select org_id from org_members where user_id = auth.uid() and role in ('owner', 'admin'))
  );

create table if not exists inspection_template_rooms (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid references inspection_templates(id) on delete cascade not null,
  name        text not null,
  room_order  int not null default 0,
  created_at  timestamptz default now()
);

create index if not exists inspection_template_rooms_template_id_idx on inspection_template_rooms(template_id);

alter table inspection_template_rooms enable row level security;

create policy "org_members_read_inspection_template_rooms" on inspection_template_rooms
  for select using (
    template_id in (
      select id from inspection_templates
      where org_id in (select org_id from org_members where user_id = auth.uid())
    )
  );

create policy "org_admins_write_inspection_template_rooms" on inspection_template_rooms
  for all using (
    template_id in (
      select id from inspection_templates
      where org_id in (select org_id from org_members where user_id = auth.uid() and role in ('owner', 'admin'))
    )
  );

create table if not exists inspection_template_items (
  id                uuid primary key default gen_random_uuid(),
  template_room_id  uuid references inspection_template_rooms(id) on delete cascade not null,
  label             text not null,
  item_order        int not null default 0,
  created_at        timestamptz default now()
);

create index if not exists inspection_template_items_room_id_idx on inspection_template_items(template_room_id);

alter table inspection_template_items enable row level security;

create policy "org_members_read_inspection_template_items" on inspection_template_items
  for select using (
    template_room_id in (
      select id from inspection_template_rooms where template_id in (
        select id from inspection_templates
        where org_id in (select org_id from org_members where user_id = auth.uid())
      )
    )
  );

create policy "org_admins_write_inspection_template_items" on inspection_template_items
  for all using (
    template_room_id in (
      select id from inspection_template_rooms where template_id in (
        select id from inspection_templates
        where org_id in (select org_id from org_members where user_id = auth.uid() and role in ('owner', 'admin'))
      )
    )
  );

-- Inspection instances

create table if not exists inspections (
  id                            uuid primary key default gen_random_uuid(),
  org_id                        uuid references organizations(id) on delete cascade not null,
  unit_id                       uuid references units(id) on delete cascade not null,
  tenant_id                     uuid references tenants(id) not null,
  template_id                   uuid references inspection_templates(id),
  type                          text not null, -- 'move_in' | 'move_out'
  status                        text not null default 'draft', -- 'draft' | 'submitted' | 'completed'
  inspector_id                  uuid references auth.users(id),
  inspected_at                  timestamptz,
  linked_move_in_inspection_id  uuid references inspections(id),
  tenant_signature_url          text,
  tenant_signed_at              timestamptz,
  inspector_signature_url       text,
  inspector_signed_at           timestamptz,
  created_by                    uuid references auth.users(id),
  created_at                    timestamptz default now(),
  updated_at                    timestamptz default now()
);

create index if not exists inspections_org_id_idx on inspections(org_id);
create index if not exists inspections_unit_id_idx on inspections(unit_id);
create index if not exists inspections_tenant_id_idx on inspections(tenant_id);

alter table inspections enable row level security;

create policy "org_members_read_inspections" on inspections
  for select using (
    org_id in (select org_id from org_members where user_id = auth.uid())
  );

create policy "org_members_insert_inspections" on inspections
  for insert with check (
    org_id in (select org_id from org_members where user_id = auth.uid() and role != 'viewer')
  );

create policy "org_members_update_inspections" on inspections
  for update using (
    org_id in (select org_id from org_members where user_id = auth.uid() and role != 'viewer')
  );

create table if not exists inspection_items (
  id                uuid primary key default gen_random_uuid(),
  inspection_id     uuid references inspections(id) on delete cascade not null,
  template_item_id  uuid references inspection_template_items(id) on delete set null,
  room_name         text not null,
  item_label        text not null,
  item_order        int not null default 0,
  condition         text not null default 'good', -- 'good' | 'fair' | 'damaged' | 'missing' | 'not_applicable'
  note              text,
  converted_snag_id uuid references snags(id),
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create index if not exists inspection_items_inspection_id_idx on inspection_items(inspection_id);

alter table inspection_items enable row level security;

create policy "org_members_read_inspection_items" on inspection_items
  for select using (
    inspection_id in (
      select id from inspections
      where org_id in (select org_id from org_members where user_id = auth.uid())
    )
  );

create policy "org_members_write_inspection_items" on inspection_items
  for all using (
    inspection_id in (
      select id from inspections
      where org_id in (select org_id from org_members where user_id = auth.uid() and role != 'viewer')
    )
  );

-- Extend attachments to also hold inspection-item photos (same bucket, same upload pattern as snag photos)

alter table attachments add column if not exists inspection_item_id uuid references inspection_items(id) on delete cascade;
alter table attachments alter column snag_id drop not null;
alter table attachments add constraint attachments_one_parent_chk
  check (
    (snag_id is not null and inspection_item_id is null) or
    (snag_id is null and inspection_item_id is not null)
  );
