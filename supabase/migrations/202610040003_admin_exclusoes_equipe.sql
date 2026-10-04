-- Administração do CRM: exclusões protegidas e funções de equipe.

alter table public.team_invites add column if not exists team_function text not null default 'Atendente';
alter table public.team_invites add column if not exists requested_role public.crm_role not null default 'staff';
alter table public.team_invites drop constraint if exists team_invites_team_function_check;
alter table public.team_invites add constraint team_invites_team_function_check check (team_function in ('Atendente','Estagiário','Advogado'));
alter table public.team_invites drop constraint if exists team_invites_requested_role_check;
alter table public.team_invites add constraint team_invites_requested_role_check check (requested_role in ('staff','super_admin'));

alter table public.profiles drop constraint if exists profiles_team_function_check;
alter table public.profiles add constraint profiles_team_function_check check (team_function is null or team_function in ('Atendente','Estagiário','Advogado','Auxiliar'));
update public.profiles set team_function='Atendente' where role='staff' and team_function is null;

create or replace function private.is_crm_admin() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.profiles where id=(select auth.uid()) and role in ('owner','super_admin'));
$$;
create or replace function private.is_crm_owner() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.profiles where id=(select auth.uid()) and role in ('owner','super_admin'));
$$;
create or replace function private.is_crm_staff() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.profiles where id=(select auth.uid()) and role in ('owner','super_admin','staff'));
$$;
create or replace function public.crm_staff_access() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role in ('owner','super_admin','staff'));
$$;
create or replace function private.can_access_contact(target uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('owner','super_admin'))
    or exists(select 1 from public.profiles p join public.client_assignments a on a.staff_id=p.id where p.id=(select auth.uid()) and p.role='staff' and a.contact_id=target)
$$;

create or replace function private.handle_auth_user() returns trigger language plpgsql security definer set search_path='' as $$
declare normalized_email text:=lower(new.email); matched_contact uuid; assigned_role public.crm_role:='pending'; invite_role public.crm_role; invite_function text;
begin
  select id into matched_contact from public.contacts where email=normalized_email and kind='client' limit 1;
  if normalized_email='adrianoguimaraes.sp@gmail.com' then assigned_role:='owner'; matched_contact:=null;
  else
    select requested_role,team_function into invite_role,invite_function from public.team_invites where email=normalized_email limit 1;
    if invite_role is not null then assigned_role:=invite_role; matched_contact:=null;
    elsif matched_contact is not null then assigned_role:='client'; end if;
  end if;
  insert into public.profiles(id,email,full_name,role,contact_id,team_function) values(new.id,normalized_email,nullif(new.raw_user_meta_data->>'full_name',''),assigned_role,matched_contact,coalesce(invite_function,case when assigned_role in ('owner','super_admin') then 'Advogado' else null end))
  on conflict(id) do update set email=excluded.email,full_name=coalesce(excluded.full_name,public.profiles.full_name),role=excluded.role,contact_id=excluded.contact_id,team_function=coalesce(excluded.team_function,public.profiles.team_function);
  return new;
end; $$;

drop policy if exists client_documents_delete on public.client_documents;
create policy client_documents_delete on public.client_documents for delete to authenticated using (private.is_crm_owner() or user_id=(select auth.uid()));
drop policy if exists cases_admin_delete on public.cases;
create policy cases_admin_delete on public.cases for delete to authenticated using (private.is_crm_owner());
drop policy if exists tasks_admin_delete on public.tasks;
create policy tasks_admin_delete on public.tasks for delete to authenticated using (private.is_crm_owner());
drop policy if exists contacts_admin_delete on public.contacts;
create policy contacts_admin_delete on public.contacts for delete to authenticated using (private.is_crm_owner());
drop policy if exists attendances_admin_delete on public.attendances;
create policy attendances_admin_delete on public.attendances for delete to authenticated using (private.is_crm_owner());
drop policy if exists team_invites_admin_delete on public.team_invites;
create policy team_invites_admin_delete on public.team_invites for delete to authenticated using (private.is_crm_owner());
drop policy if exists storage_client_files_delete on storage.objects;
create policy storage_client_files_delete on storage.objects for delete to authenticated using (bucket_id='client-documents' and private.is_crm_owner());

grant execute on function private.is_crm_admin() to authenticated;
grant delete on public.client_documents,public.cases,public.tasks,public.contacts,public.attendances,public.team_invites to authenticated;
