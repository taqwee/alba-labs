-- =====================================================================
-- Lunomi Studio — 0003 grants, Row Level Security, storage
-- Principle: deny by default. Every table has RLS enabled.
-- Writes that the browser must never perform (audit log, notifications,
-- WhatsApp state) have NO user policies: only the server (service role) writes them.
-- =====================================================================

-- ---------- grants ---------------------------------------------------
revoke all on all tables in schema public from anon;
grant select on services, service_features, portfolio_items, portfolio_services, site_settings to anon;
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke update on notifications from authenticated;
grant update (read_at) on notifications to authenticated;
revoke insert, update, delete on activity_logs, whatsapp_webhook_events from authenticated;

-- ---------- enable RLS everywhere -------------------------------------
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ---------- identity --------------------------------------------------
create policy profiles_select on profiles for select to authenticated using (
  id = auth.uid()
  or is_admin()
  or (is_staff() and (
        role <> 'CUSTOMER'
        or exists (select 1 from customers c where c.profile_id = profiles.id and staff_can_access_customer(c.id))))
);
create policy profiles_update_self  on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_update_admin on profiles for update to authenticated
  using (has_permission('staff.manage') or has_permission('customer.manage'))
  with check (has_permission('staff.manage') or has_permission('customer.manage'));

create policy permissions_select on permissions for select to authenticated using (true);
create policy role_permissions_select on role_permissions for select to authenticated using (true);

create policy profile_permissions_select on profile_permissions for select to authenticated
  using (profile_id = auth.uid() or has_permission('staff.manage'));
create policy profile_permissions_write on profile_permissions for all to authenticated
  using (has_permission('staff.manage')) with check (has_permission('staff.manage'));

create policy staff_profiles_select on staff_profiles for select to authenticated
  using (profile_id = auth.uid() or has_permission('staff.read'));
create policy staff_profiles_write on staff_profiles for all to authenticated
  using (has_permission('staff.manage')) with check (has_permission('staff.manage'));

create policy customers_select on customers for select to authenticated using (
  profile_id = auth.uid()
  or has_permission('customer.manage')
  or (has_permission('customer.read') and staff_can_access_customer(id))
);
create policy customers_update on customers for update to authenticated
  using (profile_id = auth.uid() or has_permission('customer.manage'))
  with check (profile_id = auth.uid() or has_permission('customer.manage'));
create policy customers_insert on customers for insert to authenticated
  with check (has_permission('customer.manage'));
create policy customers_delete on customers for delete to authenticated
  using (has_permission('customer.manage'));

-- ---------- public content --------------------------------------------
create policy services_select on services for select to anon, authenticated
  using (status = 'ACTIVE' or has_permission('service.manage'));
create policy services_write on services for all to authenticated
  using (has_permission('service.manage')) with check (has_permission('service.manage'));

create policy service_features_select on service_features for select to anon, authenticated
  using (exists (select 1 from services s where s.id = service_features.service_id));
create policy service_features_write on service_features for all to authenticated
  using (has_permission('service.manage')) with check (has_permission('service.manage'));

create policy portfolio_select on portfolio_items for select to anon, authenticated
  using (status = 'PUBLISHED' or has_permission('portfolio.manage'));
create policy portfolio_write on portfolio_items for all to authenticated
  using (has_permission('portfolio.manage')) with check (has_permission('portfolio.manage'));

create policy portfolio_services_select on portfolio_services for select to anon, authenticated
  using (exists (select 1 from portfolio_items p where p.id = portfolio_services.portfolio_id));
create policy portfolio_services_write on portfolio_services for all to authenticated
  using (has_permission('portfolio.manage')) with check (has_permission('portfolio.manage'));

create policy site_settings_select on site_settings for select to anon, authenticated using (true);
create policy site_settings_write on site_settings for all to authenticated
  using (has_permission('settings.manage')) with check (has_permission('settings.manage'));

-- ---------- CRM -------------------------------------------------------
create policy leads_select on leads for select to authenticated
  using (has_permission('lead.read') or customer_id = my_customer_id());
create policy leads_write on leads for all to authenticated
  using (has_permission('lead.manage')) with check (has_permission('lead.manage'));

-- ---------- projects / tasks -------------------------------------------
create policy projects_select on projects for select to authenticated using (can_access_project(id));
create policy projects_insert on projects for insert to authenticated with check (has_permission('project.manage'));
create policy projects_delete on projects for delete to authenticated using (has_permission('project.manage'));
create policy projects_update on projects for update to authenticated
  using (has_permission('project.manage')
         or (is_staff() and has_permission('project.update') and can_access_project(id)))
  with check (has_permission('project.manage')
         or (is_staff() and has_permission('project.update') and can_access_project(id)));

create policy project_services_select on project_services for select to authenticated using (can_access_project(project_id));
create policy project_services_write  on project_services for all to authenticated
  using (has_permission('project.manage')) with check (has_permission('project.manage'));

create policy project_members_select on project_members for select to authenticated using (can_access_project(project_id));
create policy project_members_write  on project_members for all to authenticated
  using (has_permission('project.manage')) with check (has_permission('project.manage'));

create policy project_updates_select on project_updates for select to authenticated using (
  can_access_project(project_id) and (visible_to_customer or app_role() in ('ADMIN','STAFF'))
);
create policy project_updates_insert on project_updates for insert to authenticated with check (
  author_id = auth.uid() and (
    has_permission('project.manage')
    or (is_staff() and has_permission('project.update') and can_access_project(project_id)))
);

create policy tasks_select on tasks for select to authenticated using (
  has_permission('task.manage') or (has_permission('task.read') and assigned_to = auth.uid())
);
create policy tasks_insert on tasks for insert to authenticated with check (has_permission('task.manage'));
create policy tasks_delete on tasks for delete to authenticated using (has_permission('task.manage'));
create policy tasks_update on tasks for update to authenticated
  using (has_permission('task.manage') or (has_permission('task.update') and assigned_to = auth.uid()))
  with check (has_permission('task.manage') or (has_permission('task.update') and assigned_to = auth.uid()));

-- ---------- WhatsApp (server writes; staff read what they can reach) ----
create policy whatsapp_contacts_select on whatsapp_contacts for select to authenticated using (
  has_permission('whatsapp.manage') or has_permission('conversation.manage')
  or exists (select 1 from conversations c
              where c.whatsapp_contact_id = whatsapp_contacts.id and can_staff_read_conversation(c.id))
);
create policy webhook_events_select on whatsapp_webhook_events for select to authenticated
  using (has_permission('whatsapp.manage'));

-- ---------- conversations ----------------------------------------------
create policy conversations_select on conversations for select to authenticated using (can_read_conversation(id));
create policy conversations_insert on conversations for insert to authenticated with check (
  has_permission('conversation.manage')
  or (customer_id = my_customer_id() and channel = 'WEBSITE' and assigned_to is null and status = 'UNASSIGNED')
);
create policy conversations_update on conversations for update to authenticated
  using (has_permission('conversation.manage') or can_reply_conversation(id))
  with check (has_permission('conversation.manage') or can_reply_conversation(id));
create policy conversations_delete on conversations for delete to authenticated
  using (has_permission('conversation.manage'));

create policy conv_assignments_select on conversation_assignments for select to authenticated
  using (can_staff_read_conversation(conversation_id));

create policy messages_select on messages for select to authenticated using (can_read_conversation(conversation_id));
create policy messages_insert_staff on messages for insert to authenticated with check (
  sender_type = 'STAFF' and direction = 'OUTBOUND' and sender_id = auth.uid()
  and can_reply_conversation(conversation_id)
);
create policy messages_insert_customer on messages for insert to authenticated with check (
  sender_type = 'CUSTOMER' and direction = 'INBOUND' and sender_id = auth.uid()
  and exists (select 1 from conversations c
               where c.id = conversation_id and c.customer_id = my_customer_id() and c.channel = 'WEBSITE')
);

create policy message_attachments_select on message_attachments for select to authenticated
  using (exists (select 1 from messages m where m.id = message_attachments.message_id));
create policy message_attachments_insert on message_attachments for insert to authenticated
  with check (exists (select 1 from messages m where m.id = message_attachments.message_id and m.sender_id = auth.uid()));

create policy internal_notes_select on internal_notes for select to authenticated
  using (can_staff_read_conversation(conversation_id));
create policy internal_notes_insert on internal_notes for insert to authenticated
  with check (author_id = auth.uid() and can_staff_read_conversation(conversation_id));

-- ---------- files --------------------------------------------------------
create policy files_select on files for select to authenticated using (
  customer_id = my_customer_id()
  or has_permission('customer.manage')
  or (has_permission('customer.read') and staff_can_access_customer(customer_id))
);
create policy files_insert on files for insert to authenticated with check (
  uploaded_by = auth.uid() and (
    customer_id = my_customer_id()
    or has_permission('customer.manage')
    or (has_permission('customer.read') and staff_can_access_customer(customer_id)))
);
create policy files_delete on files for delete to authenticated
  using (has_permission('customer.manage'));

-- ---------- notifications / audit ------------------------------------------
create policy notifications_select on notifications for select to authenticated using (recipient_id = auth.uid());
create policy notifications_update on notifications for update to authenticated
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

create policy activity_logs_select on activity_logs for select to authenticated using (has_permission('audit.read'));

-- ---------- storage -------------------------------------------------------
-- private-files : private. Object path = <customer_id>/<uuid>-<name>
-- public-assets : public read (portfolio + service images). Writes only by the server.
insert into storage.buckets (id, name, public, file_size_limit)
values ('private-files', 'private-files', false, 10485760),
       ('public-assets', 'public-assets', true, 5242880)
on conflict (id) do nothing;

-- Uploads go through the server (validated MIME + magic bytes + size), which uses the
-- service role. These SELECT policies are defence in depth for direct storage access.
create policy private_files_select on storage.objects for select to authenticated using (
  bucket_id = 'private-files' and (
    has_permission('customer.manage')
    or (storage.foldername(name))[1] = my_customer_id()::text
    or (has_permission('customer.read') and staff_can_access_customer(((storage.foldername(name))[1])::uuid))
  )
);
