-- Núcleo Advogados CRM — Supabase/Postgres
-- Aplicado ao projeto remoto como a migração crm_initial.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

do $$ begin
  create type public.crm_role as enum ('owner', 'staff', 'client', 'pending');
exception when duplicate_object then null;
end $$;

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  email text unique check (email is null or (email = lower(email) and char_length(email) <= 254)),
  phone text not null default '' check (char_length(phone) <= 50),
  kind text not null default 'lead' check (kind in ('lead', 'client')),
  stage text not null default 'novo' check (stage in ('novo', 'em contato', 'proposta enviada', 'negociação', 'convertido')),
  source text not null default '' check (char_length(source) <= 100),
  notes text not null default '' check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique check (email = lower(email)),
  full_name text,
  role public.crm_role not null default 'pending',
  contact_id uuid unique references public.contacts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_profile_link check ((role = 'client' and contact_id is not null) or (role <> 'client'))
);

create table if not exists public.team_invites (
  email text primary key check (email = lower(email) and char_length(email) <= 254),
  created_at timestamptz not null default now()
);

create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  area text not null default '' check (char_length(area) <= 100),
  number text not null default '' check (char_length(number) <= 100),
  status text not null default 'em andamento' check (status in ('em andamento', 'aguardando', 'audiência', 'concluído', 'arquivado')),
  description text not null default '' check (char_length(description) <= 3000),
  visible_to_client boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, contact_id)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  case_id uuid,
  title text not null check (char_length(title) between 1 and 180),
  due_at date,
  done boolean not null default false,
  visible_to_client boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (case_id, contact_id) references public.cases(id, contact_id) on delete cascade
);

create index if not exists contacts_kind_stage_idx on public.contacts(kind, stage);
create index if not exists cases_contact_updated_idx on public.cases(contact_id, updated_at desc);
create index if not exists tasks_contact_due_idx on public.tasks(contact_id, due_at);
create index if not exists tasks_case_contact_idx on public.tasks(case_id, contact_id);
create index if not exists tasks_open_due_idx on public.tasks(due_at) where done = false;
create index if not exists profiles_role_idx on public.profiles(role);

-- O e-mail de proprietária é atribuído diretamente no gatilho abaixo; não requer convite de equipe.

create or replace function private.is_crm_staff()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.profiles where id = (select auth.uid()) and role in ('owner','staff')) $$;

create or replace function private.is_crm_owner()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.profiles where id = (select auth.uid()) and role = 'owner') $$;

create or replace function private.current_contact_id()
returns uuid language sql stable security definer set search_path = ''
as $$ select contact_id from public.profiles where id = (select auth.uid()) and role = 'client' $$;

revoke all on function private.is_crm_staff() from public, anon;
revoke all on function private.is_crm_owner() from public, anon;
revoke all on function private.current_contact_id() from public, anon;
grant execute on function private.is_crm_staff() to authenticated;
grant execute on function private.is_crm_owner() to authenticated;
grant execute on function private.current_contact_id() to authenticated;

create or replace function private.set_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists contacts_set_updated_at on public.contacts;
create trigger contacts_set_updated_at before update on public.contacts for each row execute function private.set_updated_at();
drop trigger if exists cases_set_updated_at on public.cases;
create trigger cases_set_updated_at before update on public.cases for each row execute function private.set_updated_at();
drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at before update on public.tasks for each row execute function private.set_updated_at();
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function private.set_updated_at();

create or replace function private.handle_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  normalized_email text := lower(new.email);
  matched_contact uuid;
  assigned_role public.crm_role := 'pending';
begin
  select id into matched_contact from public.contacts where email = normalized_email and kind = 'client' limit 1;
  if normalized_email = 'adrianoguimaraes.sp@gmail.com' then assigned_role := 'owner'; matched_contact := null;
  elsif exists(select 1 from public.team_invites where email = normalized_email) then assigned_role := 'staff'; matched_contact := null;
  elsif matched_contact is not null then assigned_role := 'client';
  end if;
  insert into public.profiles(id,email,full_name,role,contact_id)
  values(new.id, normalized_email, nullif(new.raw_user_meta_data->>'full_name',''), assigned_role, matched_contact)
  on conflict(id) do update set email=excluded.email, full_name=coalesce(excluded.full_name,public.profiles.full_name), role=excluded.role, contact_id=excluded.contact_id;
  return new;
end;
$$;

drop trigger if exists crm_auth_user_sync on auth.users;
create trigger crm_auth_user_sync after insert or update of email on auth.users for each row execute function private.handle_auth_user();

insert into public.profiles(id,email,full_name,role,contact_id)
select u.id, lower(u.email), nullif(u.raw_user_meta_data->>'full_name',''),
  case when lower(u.email)='adrianoguimaraes.sp@gmail.com' then 'owner'::public.crm_role
       when exists(select 1 from public.team_invites i where i.email=lower(u.email)) then 'staff'::public.crm_role
       when c.id is not null then 'client'::public.crm_role else 'pending'::public.crm_role end,
  case when lower(u.email)<>'adrianoguimaraes.sp@gmail.com' and not exists(select 1 from public.team_invites i where i.email=lower(u.email)) then c.id end
from auth.users u left join public.contacts c on c.email=lower(u.email) and c.kind='client'
on conflict(id) do nothing;

create or replace function private.sync_contact_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    update public.profiles set role='pending', contact_id=null where contact_id=old.id and role='client';
    return old;
  end if;
  update public.profiles set role='pending', contact_id=null where contact_id=new.id and role='client' and (new.kind<>'client' or email is distinct from new.email);
  if new.kind='client' and new.email is not null then
    update public.profiles set role='client', contact_id=new.id where email=new.email and role in ('pending','client');
  end if;
  return new;
end;
$$;

drop trigger if exists contact_profile_sync_write on public.contacts;
create trigger contact_profile_sync_write after insert or update of email,kind on public.contacts for each row execute function private.sync_contact_profile();
drop trigger if exists contact_profile_sync_delete on public.contacts;
create trigger contact_profile_sync_delete before delete on public.contacts for each row execute function private.sync_contact_profile();

create or replace function private.sync_team_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op='INSERT' then update public.profiles set role='staff',contact_id=null where email=new.email and role<>'owner'; return new;
  else update public.profiles set role='pending',contact_id=null where email=old.email and role='staff'; return old;
  end if;
end;
$$;

drop trigger if exists team_profile_sync on public.team_invites;
create trigger team_profile_sync after insert or delete on public.team_invites for each row execute function private.sync_team_profile();

alter table public.profiles enable row level security;
alter table public.team_invites enable row level security;
alter table public.contacts enable row level security;
alter table public.cases enable row level security;
alter table public.tasks enable row level security;

drop policy if exists profiles_read_own on public.profiles;
drop policy if exists profiles_staff_read on public.profiles;
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using ((select auth.uid())=id or private.is_crm_staff());
drop policy if exists profiles_owner_update on public.profiles;
create policy profiles_owner_update on public.profiles for update to authenticated using (private.is_crm_owner()) with check (private.is_crm_owner());

drop policy if exists team_owner_all on public.team_invites;
create policy team_owner_all on public.team_invites for all to authenticated using (private.is_crm_owner()) with check (private.is_crm_owner());

drop policy if exists contacts_staff_all on public.contacts;
drop policy if exists contacts_client_read on public.contacts;
drop policy if exists contacts_read on public.contacts;
create policy contacts_read on public.contacts for select to authenticated using ((select private.is_crm_staff()));
drop policy if exists contacts_staff_insert on public.contacts;
create policy contacts_staff_insert on public.contacts for insert to authenticated with check (private.is_crm_staff());
drop policy if exists contacts_staff_update on public.contacts;
create policy contacts_staff_update on public.contacts for update to authenticated using (private.is_crm_staff()) with check (private.is_crm_staff());
drop policy if exists contacts_staff_delete on public.contacts;
create policy contacts_staff_delete on public.contacts for delete to authenticated using (private.is_crm_staff());

drop policy if exists cases_staff_all on public.cases;
drop policy if exists cases_client_read on public.cases;
drop policy if exists cases_read on public.cases;
create policy cases_read on public.cases for select to authenticated using (private.is_crm_staff() or (visible_to_client and contact_id=private.current_contact_id()));
drop policy if exists cases_staff_insert on public.cases;
create policy cases_staff_insert on public.cases for insert to authenticated with check (private.is_crm_staff());
drop policy if exists cases_staff_update on public.cases;
create policy cases_staff_update on public.cases for update to authenticated using (private.is_crm_staff()) with check (private.is_crm_staff());
drop policy if exists cases_staff_delete on public.cases;
create policy cases_staff_delete on public.cases for delete to authenticated using (private.is_crm_staff());

drop policy if exists tasks_staff_all on public.tasks;
drop policy if exists tasks_client_read on public.tasks;
drop policy if exists tasks_read on public.tasks;
create policy tasks_read on public.tasks for select to authenticated using (private.is_crm_staff() or (visible_to_client and contact_id=private.current_contact_id()));
drop policy if exists tasks_staff_insert on public.tasks;
create policy tasks_staff_insert on public.tasks for insert to authenticated with check (private.is_crm_staff());
drop policy if exists tasks_staff_update on public.tasks;
create policy tasks_staff_update on public.tasks for update to authenticated using (private.is_crm_staff()) with check (private.is_crm_staff());
drop policy if exists tasks_staff_delete on public.tasks;
create policy tasks_staff_delete on public.tasks for delete to authenticated using (private.is_crm_staff());

revoke all on table public.profiles,public.team_invites,public.contacts,public.cases,public.tasks from anon;
grant select,update on table public.profiles to authenticated;
grant select,insert,update,delete on table public.team_invites,public.contacts,public.cases,public.tasks to authenticated;
