-- =====================================================================
-- Lunomi Studio — 0002 permissions, helper functions, RPCs, triggers
-- The permission matrix here MUST match lib/permissions/index.ts
-- (tests/permissions.test.ts checks this).
-- =====================================================================

insert into permissions (key, description) values
  ('conversation.read',   'Read conversations assigned to you'),
  ('conversation.reply',  'Reply to customers in conversations assigned to you'),
  ('conversation.assign', 'Assign, reassign and unassign conversations'),
  ('conversation.manage', 'Read and manage every conversation'),
  ('customer.read',       'Read customers you work with'),
  ('customer.manage',     'Read and edit every customer'),
  ('staff.read',          'View staff members'),
  ('staff.manage',        'Invite, deactivate and configure staff'),
  ('project.read',        'Read projects you are a member of'),
  ('project.update',      'Update projects you are a member of'),
  ('project.manage',      'Create and manage every project'),
  ('task.read',           'Read tasks assigned to you'),
  ('task.update',         'Update tasks assigned to you'),
  ('task.manage',         'Create and manage every task'),
  ('service.read',        'View all services including inactive'),
  ('service.manage',      'Create and manage services'),
  ('portfolio.manage',    'Create and manage portfolio items'),
  ('lead.read',           'Read leads'),
  ('lead.manage',         'Manage leads'),
  ('whatsapp.manage',     'View WhatsApp integration and use mock mode'),
  ('settings.manage',     'Edit site settings'),
  ('audit.read',          'Read the activity log');

insert into role_permissions (role, permission_key)
  select 'ADMIN', key from permissions;

insert into role_permissions (role, permission_key) values
  ('STAFF','conversation.read'),
  ('STAFF','conversation.reply'),
  ('STAFF','customer.read'),
  ('STAFF','project.read'),
  ('STAFF','project.update'),
  ('STAFF','task.read'),
  ('STAFF','task.update');
-- CUSTOMER has no operational permissions: customers are limited by ownership (RLS).

-- ---------- identity helpers (SECURITY DEFINER avoids RLS recursion) --
create or replace function app_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid() and is_active
$$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(app_role() = 'ADMIN', false)
$$;

create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(app_role() = 'STAFF', false)
$$;

create or replace function has_permission(p_key text) returns boolean
language sql stable security definer set search_path = public as $$
  select
    app_role() is not null
    and (
      exists (select 1 from role_permissions rp where rp.role = app_role() and rp.permission_key = p_key)
      or exists (select 1 from profile_permissions pp where pp.profile_id = auth.uid() and pp.permission_key = p_key)
    )
$$;

create or replace function my_permissions() returns setof text
language sql stable security definer set search_path = public as $$
  select rp.permission_key from role_permissions rp where rp.role = app_role()
  union
  select pp.permission_key from profile_permissions pp
   where pp.profile_id = auth.uid() and app_role() is not null
$$;

create or replace function my_customer_id() returns uuid
language sql stable security definer set search_path = public as $$
  select c.id from customers c
   where c.profile_id = auth.uid() and app_role() = 'CUSTOMER'
$$;

-- Staff reach a customer only through a conversation assigned to them
-- or a project they are a member of.
create or replace function staff_can_access_customer(p_customer uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_staff() and (
    exists (select 1 from conversations c where c.customer_id = p_customer and c.assigned_to = auth.uid())
    or exists (select 1 from projects p join project_members m on m.project_id = p.id
                where p.customer_id = p_customer and m.staff_id = auth.uid())
  )
$$;

create or replace function can_access_project(p_project uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select
    has_permission('project.manage')
    or (is_staff() and has_permission('project.read')
        and exists (select 1 from project_members m where m.project_id = p_project and m.staff_id = auth.uid()))
    or exists (select 1 from projects p where p.id = p_project and p.customer_id = my_customer_id())
$$;

-- Staff-side visibility (internal notes, assignment history).
create or replace function can_staff_read_conversation(p_conversation uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select app_role() in ('ADMIN','STAFF') and (
    has_permission('conversation.manage')
    or (has_permission('conversation.read')
        and exists (select 1 from conversations c where c.id = p_conversation and c.assigned_to = auth.uid()))
  )
$$;

-- Everyone who may see a conversation: staff-side rules + the owning customer.
create or replace function can_read_conversation(p_conversation uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select can_staff_read_conversation(p_conversation)
      or exists (select 1 from conversations c
                  where c.id = p_conversation
                    and c.customer_id = my_customer_id()
                    and c.channel <> 'INTERNAL')
$$;

-- Replying requires the conversation to be assigned to YOU (admins included),
-- so that merely monitoring a conversation can never send anything.
create or replace function can_reply_conversation(p_conversation uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select app_role() in ('ADMIN','STAFF')
     and has_permission('conversation.reply')
     and exists (select 1 from conversations c where c.id = p_conversation and c.assigned_to = auth.uid())
$$;

-- ---------- protect privileged columns ------------------------------
create or replace function guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role or new.is_active is distinct from old.is_active)
     and auth.uid() is not null and not is_admin() then
    raise exception 'Not allowed to change role or active state';
  end if;
  return new;
end $$;
create trigger profiles_guard before update on profiles
  for each row execute function guard_profile_update();

create or replace function guard_conversation_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    if new.assigned_to is distinct from old.assigned_to and not has_permission('conversation.assign') then
      raise exception 'Not allowed to change assignment';
    end if;
    if (new.customer_id is distinct from old.customer_id
        or new.channel is distinct from old.channel
        or new.whatsapp_contact_id is distinct from old.whatsapp_contact_id)
       and not has_permission('conversation.manage') then
      raise exception 'Not allowed to change conversation owner or channel';
    end if;
  end if;
  return new;
end $$;
create trigger conversations_guard before update on conversations
  for each row execute function guard_conversation_update();

-- ---------- assignment RPC (atomic, history, permission-checked) ------
create or replace function assign_conversation(p_conversation uuid, p_staff uuid)
returns conversations
language plpgsql security definer set search_path = public as $$
declare
  conv conversations;
  previous uuid;
begin
  if not has_permission('conversation.assign') then
    raise exception 'Not allowed to assign conversations';
  end if;

  select * into conv from conversations where id = p_conversation for update;
  if not found then raise exception 'Conversation not found'; end if;

  if p_staff is not null and not exists (
       select 1 from profiles where id = p_staff and is_active and role in ('STAFF','ADMIN')) then
    raise exception 'Target must be an active staff member';
  end if;

  previous := conv.assigned_to;
  if previous is not distinct from p_staff then return conv; end if;

  update conversations
     set assigned_to = p_staff,
         status = case
           when p_staff is null and status in ('OPEN','IN_PROGRESS','WAITING_FOR_STAFF','WAITING_FOR_CUSTOMER') then 'UNASSIGNED'::conversation_status
           when p_staff is not null and status = 'UNASSIGNED' then 'OPEN'::conversation_status
           else status end
   where id = p_conversation
   returning * into conv;

  insert into conversation_assignments (conversation_id, from_staff_id, to_staff_id, changed_by)
  values (p_conversation, previous, p_staff, auth.uid());

  return conv;
end $$;

-- ---------- keep conversation summary in sync with messages -----------
create or replace function on_message_inserted() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update conversations c set
    last_message_at = new.created_at,
    last_message_preview = left(new.body, 140),
    status = case
      when new.sender_type = 'CUSTOMER' and c.status in ('WAITING_FOR_CUSTOMER','RESOLVED','CLOSED') then
        (case when c.assigned_to is null then 'UNASSIGNED' else 'WAITING_FOR_STAFF' end)::conversation_status
      when new.sender_type = 'CUSTOMER' and c.status in ('OPEN') then 'WAITING_FOR_STAFF'::conversation_status
      when new.sender_type = 'STAFF' and c.status in ('OPEN','IN_PROGRESS','WAITING_FOR_STAFF') then 'WAITING_FOR_CUSTOMER'::conversation_status
      else c.status end
  where c.id = new.conversation_id;
  return new;
end $$;
create trigger messages_after_insert after insert on messages
  for each row execute function on_message_inserted();

-- ---------- realtime -------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table messages, notifications, conversations;
  end if;
end $$;
