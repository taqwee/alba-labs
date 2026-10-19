-- Run against a database that has migrations applied (psql or Supabase SQL editor on a DEV project).
-- Creates throwaway users, asserts isolation, then rolls everything back.
begin;
insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-0000000000a1','admin@t.test'),
 ('00000000-0000-0000-0000-0000000000b1','staff1@t.test'),
 ('00000000-0000-0000-0000-0000000000b2','staff2@t.test'),
 ('00000000-0000-0000-0000-0000000000c1','custa@t.test'),
 ('00000000-0000-0000-0000-0000000000c2','custb@t.test');
update profiles set role='ADMIN' where email='admin@t.test';
update profiles set role='STAFF' where email like 'staff%';
-- the invite flow removes the auto-created customer row when promoting a user
delete from customers where profile_id in (select id from profiles where role <> 'CUSTOMER');
insert into conversations (id, customer_id, channel, status, assigned_to)
 select ('10000000-0000-0000-0000-00000000000'||n)::uuid, c.id, 'WEBSITE', 'OPEN', s
 from (values (1,'custa@t.test','00000000-0000-0000-0000-0000000000b1'::uuid),
              (2,'custb@t.test','00000000-0000-0000-0000-0000000000b2'::uuid)) v(n,e,s)
 join customers c on c.email = v.e;
insert into messages (conversation_id, direction, sender_type, body) values
 ('10000000-0000-0000-0000-000000000001','INBOUND','CUSTOMER','A msg'),
 ('10000000-0000-0000-0000-000000000002','INBOUND','CUSTOMER','B msg');
insert into internal_notes (conversation_id, body) values ('10000000-0000-0000-0000-000000000001','secret A');

create or replace function pg_temp.as_user(u text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', u, true);
  execute 'set local role authenticated';
end $$;
create or replace function pg_temp.expect(label text, got bigint, want bigint) returns void language plpgsql as $$
begin
  if got is distinct from want then raise exception 'FAIL % (got %, want %)', label, got, want; end if;
  raise notice 'ok   %', label;
end $$;

-- Customer A
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select pg_temp.expect('custA sees own conversation only', (select count(*) from conversations), 1);
select pg_temp.expect('custA cannot see B messages', (select count(*) from messages where body='B msg'), 0);
select pg_temp.expect('custA sees own messages', (select count(*) from messages where body='A msg'), 1);
select pg_temp.expect('custA cannot read internal notes', (select count(*) from internal_notes), 0);
select pg_temp.expect('custA sees one customer row', (select count(*) from customers), 1);
do $$ begin
  begin update profiles set role='ADMIN' where id=auth.uid(); raise exception 'FAIL escalation allowed';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'ok   custA cannot self-promote'; end;
end $$;
reset role;

-- Staff 1 (assigned to A only)
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select pg_temp.expect('staff1 sees only assigned conversation', (select count(*) from conversations), 1);
select pg_temp.expect('staff1 sees only assigned customer', (select count(*) from customers), 1);
select pg_temp.expect('staff1 reads internal note on assigned', (select count(*) from internal_notes), 1);
select pg_temp.expect('staff1 cannot see B messages', (select count(*) from messages where body='B msg'), 0);
select pg_temp.expect('staff1 sees no leads', (select count(*) from leads), 0);
do $$ begin
  begin insert into messages (conversation_id, direction, sender_type, sender_id, body)
        values ('10000000-0000-0000-0000-000000000002','OUTBOUND','STAFF',auth.uid(),'hijack');
        raise exception 'FAIL staff1 replied to unassigned conversation';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'ok   staff1 cannot reply to B conversation'; end;
end $$;
do $$ begin
  begin perform assign_conversation('10000000-0000-0000-0000-000000000002', auth.uid());
        raise exception 'FAIL staff self-assigned';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'ok   staff cannot assign conversations'; end;
end $$;
reset role;

-- Admin
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select pg_temp.expect('admin sees all conversations', (select count(*) from conversations), 2);
select pg_temp.expect('admin sees all customers', (select count(*) from customers), 2);
select assign_conversation('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000b1');
select pg_temp.expect('assignment history recorded', (select count(*) from conversation_assignments), 1);
select assign_conversation('10000000-0000-0000-0000-000000000002', null);
select pg_temp.expect('unassign recorded', (select count(*) from conversation_assignments), 2);
select pg_temp.expect('unassign sets UNASSIGNED', (select count(*) from conversations where status='UNASSIGNED'), 1);
do $$ begin
  begin insert into messages (conversation_id, direction, sender_type, sender_id, body)
        values ('10000000-0000-0000-0000-000000000001','OUTBOUND','STAFF',auth.uid(),'admin no-assign');
        raise exception 'FAIL admin replied while not assigned';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'ok   admin monitoring cannot send'; end;
end $$;
reset role;

-- Anonymous visitor
set local role anon;
select pg_temp.expect('anon cannot read customers', (select count(*) from information_schema.tables where table_name='x'), 0);
do $$ begin
  begin perform 1 from customers limit 1; raise exception 'FAIL anon read customers';
  exception when insufficient_privilege then raise notice 'ok   anon has no access to customers'; end;
end $$;
reset role;
rollback;
