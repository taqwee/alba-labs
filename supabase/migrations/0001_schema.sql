-- =====================================================================
-- Lunomi Studio — 0001 schema
-- Tables, enums, indexes, triggers. Security lives in 0002 / 0003.
-- =====================================================================
create extension if not exists pgcrypto;

-- ---------- enums ----------------------------------------------------
create type user_role            as enum ('ADMIN', 'STAFF', 'CUSTOMER');
create type lead_status          as enum ('NEW','CONTACTED','QUALIFIED','PROPOSAL','CONVERTED','LOST','ARCHIVED');
create type service_status       as enum ('ACTIVE','INACTIVE','ARCHIVED');
create type content_status       as enum ('DRAFT','PUBLISHED','ARCHIVED');
create type project_status       as enum ('PLANNING','IN_PROGRESS','REVIEW','REVISION','COMPLETED','ON_HOLD','CANCELLED');
create type task_priority        as enum ('LOW','MEDIUM','HIGH','URGENT');
create type task_status          as enum ('TODO','IN_PROGRESS','BLOCKED','DONE');
-- New channels (EMAIL, INSTAGRAM, TELEGRAM) can be added later with:
--   alter type conversation_channel add value 'EMAIL';
create type conversation_channel as enum ('WHATSAPP','WEBSITE','INTERNAL');
create type conversation_status  as enum ('UNASSIGNED','OPEN','IN_PROGRESS','WAITING_FOR_CUSTOMER','WAITING_FOR_STAFF','RESOLVED','CLOSED');
create type sender_type          as enum ('CUSTOMER','STAFF','SYSTEM');
create type delivery_status      as enum ('PENDING','SENT','DELIVERED','READ','FAILED');
create type message_direction    as enum ('INBOUND','OUTBOUND');

-- ---------- helpers --------------------------------------------------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- identity -------------------------------------------------
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        user_role not null default 'CUSTOMER',
  full_name   text not null default '',
  email       text,
  phone       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index profiles_role_idx  on profiles (role);
create index profiles_email_idx on profiles (lower(email));

create table permissions (
  key         text primary key,
  description text not null
);

create table role_permissions (
  role           user_role not null,
  permission_key text not null references permissions(key) on delete cascade,
  primary key (role, permission_key)
);

-- Extra per-person grants on top of the role defaults (used for STAFF).
create table profile_permissions (
  profile_id     uuid not null references profiles(id) on delete cascade,
  permission_key text not null references permissions(key) on delete cascade,
  primary key (profile_id, permission_key)
);

create table staff_profiles (
  profile_id  uuid primary key references profiles(id) on delete cascade,
  job_title   text,
  created_at  timestamptz not null default now()
);

-- A customer is a CRM record. profile_id is null until the person has a portal
-- account (e.g. someone who first contacted the agency over WhatsApp).
create table customers (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid unique references profiles(id) on delete set null,
  full_name   text not null default '',
  email       text,
  phone       text,
  company     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index customers_email_idx on customers (lower(email));
create index customers_phone_idx on customers (phone);
create index customers_name_idx  on customers (lower(full_name));

-- ---------- content --------------------------------------------------
create table services (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title       text not null,
  summary     text not null default '',
  description text not null default '',
  pricing_info text,
  image_url   text,
  cta_label   text not null default 'Start a project',
  cta_url     text not null default '/contact',
  status      service_status not null default 'INACTIVE',
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index services_status_sort_idx on services (status, sort_order);

create table service_features (
  id          uuid primary key default gen_random_uuid(),
  service_id  uuid not null references services(id) on delete cascade,
  label       text not null,
  sort_order  int not null default 0
);
create index service_features_service_idx on service_features (service_id, sort_order);

create table portfolio_items (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title        text not null,
  description  text not null default '',
  category     text,
  client_name  text,
  technologies text[] not null default '{}',
  external_url text,
  cover_url    text,
  image_urls   text[] not null default '{}',
  status       content_status not null default 'DRAFT',
  featured     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index portfolio_status_idx on portfolio_items (status, featured);

create table portfolio_services (
  portfolio_id uuid not null references portfolio_items(id) on delete cascade,
  service_id   uuid not null references services(id) on delete cascade,
  primary key (portfolio_id, service_id)
);

-- Editable website copy (hero, process, contact details, social links).
create table site_settings (
  key        text primary key,
  value      jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- ---------- CRM ------------------------------------------------------
create table leads (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete set null,
  assigned_to uuid references profiles(id) on delete set null,
  name        text not null,
  email       text not null,
  phone       text,
  company     text,
  service_id  uuid references services(id) on delete set null,
  service_name text,
  budget      text,
  message     text not null default '',
  source      text not null default 'WEBSITE',
  status      lead_status not null default 'NEW',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index leads_status_idx   on leads (status, created_at desc);
create index leads_customer_idx on leads (customer_id);
create index leads_email_idx    on leads (lower(email));

-- ---------- projects & tasks -----------------------------------------
create table projects (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete restrict,
  title       text not null,
  description text not null default '',
  status      project_status not null default 'PLANNING',
  start_date  date,
  deadline    date,
  progress    int not null default 0 check (progress between 0 and 100),
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index projects_customer_idx on projects (customer_id);
create index projects_status_idx   on projects (status);

create table project_services (
  project_id uuid not null references projects(id) on delete cascade,
  service_id uuid not null references services(id) on delete cascade,
  primary key (project_id, service_id)
);

create table project_members (
  project_id uuid not null references projects(id) on delete cascade,
  staff_id   uuid not null references profiles(id) on delete cascade,
  added_at   timestamptz not null default now(),
  primary key (project_id, staff_id)
);
create index project_members_staff_idx on project_members (staff_id);

-- Progress notes. visible_to_customer=false makes a note internal.
create table project_updates (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  author_id   uuid references profiles(id) on delete set null,
  body        text not null,
  visible_to_customer boolean not null default true,
  created_at  timestamptz not null default now()
);
create index project_updates_project_idx on project_updates (project_id, created_at desc);

create table tasks (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references projects(id) on delete cascade,
  assigned_to uuid references profiles(id) on delete set null,
  title       text not null,
  description text not null default '',
  priority    task_priority not null default 'MEDIUM',
  status      task_status not null default 'TODO',
  due_date    date,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index tasks_assignee_idx on tasks (assigned_to, status);
create index tasks_project_idx  on tasks (project_id);

-- ---------- WhatsApp -------------------------------------------------
create table whatsapp_contacts (
  id              uuid primary key default gen_random_uuid(),
  wa_id           text not null unique,        -- digits as sent by Meta
  profile_name    text,
  customer_id     uuid references customers(id) on delete set null,
  is_mock         boolean not null default false, -- mock contacts are NEVER sent to Meta
  last_inbound_at timestamptz,                 -- drives the 24h customer-service window
  created_at      timestamptz not null default now()
);
create index whatsapp_contacts_customer_idx on whatsapp_contacts (customer_id);

-- ---------- conversations --------------------------------------------
create table conversations (
  id                  uuid primary key default gen_random_uuid(),
  customer_id         uuid not null references customers(id) on delete cascade,
  channel             conversation_channel not null,
  status              conversation_status not null default 'UNASSIGNED',
  subject             text,
  assigned_to         uuid references profiles(id) on delete set null,
  whatsapp_contact_id uuid references whatsapp_contacts(id) on delete set null,
  last_message_at     timestamptz not null default now(),
  last_message_preview text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index conversations_customer_idx on conversations (customer_id);
create index conversations_assignee_idx on conversations (assigned_to, status);
create index conversations_status_idx   on conversations (status, last_message_at desc);
create index conversations_wa_contact_idx on conversations (whatsapp_contact_id);

create table conversation_assignments (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  from_staff_id   uuid references profiles(id) on delete set null,
  to_staff_id     uuid references profiles(id) on delete set null, -- null = unassigned
  changed_by      uuid references profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index conversation_assignments_conv_idx on conversation_assignments (conversation_id, created_at desc);

create table files (
  id              uuid primary key default gen_random_uuid(),
  customer_id     uuid not null references customers(id) on delete cascade,
  project_id      uuid references projects(id) on delete set null,
  conversation_id uuid references conversations(id) on delete set null,
  uploaded_by     uuid references profiles(id) on delete set null,
  storage_path    text not null unique,        -- inside the private bucket
  file_name       text not null,
  mime_type       text not null,
  size_bytes      bigint not null check (size_bytes >= 0),
  created_at      timestamptz not null default now()
);
create index files_customer_idx     on files (customer_id);
create index files_project_idx      on files (project_id);
create index files_conversation_idx on files (conversation_id);

create table messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  direction       message_direction not null,
  sender_type     sender_type not null,
  sender_id       uuid references profiles(id) on delete set null,
  message_type    text not null default 'text',
  body            text not null default '',
  external_id     text unique,                 -- WhatsApp message id (wamid...)
  delivery_status delivery_status not null default 'PENDING',
  error           text,
  created_at      timestamptz not null default now()
);
create index messages_conversation_idx on messages (conversation_id, created_at);

create table message_attachments (
  message_id uuid not null references messages(id) on delete cascade,
  file_id    uuid not null references files(id) on delete cascade,
  primary key (message_id, file_id)
);

-- Staff/admin only. Never sent to customers or WhatsApp.
create table internal_notes (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  author_id       uuid references profiles(id) on delete set null,
  body            text not null,
  created_at      timestamptz not null default now()
);
create index internal_notes_conv_idx on internal_notes (conversation_id, created_at);

-- ---------- notifications / audit ------------------------------------
create table notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references profiles(id) on delete cascade,
  type         text not null,
  title        text not null,
  body         text,
  link         text,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index notifications_recipient_idx on notifications (recipient_id, read_at, created_at desc);

create table activity_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references profiles(id) on delete set null,
  action      text not null,
  target_type text,
  target_id   text,
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index activity_logs_created_idx on activity_logs (created_at desc);
create index activity_logs_actor_idx   on activity_logs (actor_id, created_at desc);

-- One row per processed webhook event => idempotency.
create table whatsapp_webhook_events (
  id          uuid primary key default gen_random_uuid(),
  event_key   text not null unique,           -- "msg:<wamid>" or "status:<wamid>:<status>"
  event_type  text not null,
  payload     jsonb not null,
  status      text not null default 'RECEIVED', -- RECEIVED | PROCESSED | FAILED
  error       text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

-- ---------- updated_at triggers --------------------------------------
do $$
declare t text;
begin
  foreach t in array array['profiles','customers','services','portfolio_items','leads','projects','tasks','conversations','site_settings']
  loop
    execute format('create trigger %I before update on %I for each row execute function set_updated_at()', t || '_updated_at', t);
  end loop;
end $$;

-- ---------- new auth user => profile + customer ----------------------
-- SECURITY: role is ALWAYS CUSTOMER here. user_metadata is client-controlled,
-- so it is never trusted. Staff/admin roles are set by an admin (service role).
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  display_name text := coalesce(nullif(new.raw_user_meta_data->>'full_name',''), split_part(coalesce(new.email,''),'@',1));
begin
  insert into profiles (id, role, full_name, email)
  values (new.id, 'CUSTOMER', display_name, new.email);
  insert into customers (profile_id, full_name, email)
  values (new.id, display_name, new.email);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();
