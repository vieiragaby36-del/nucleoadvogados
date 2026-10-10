-- Portal do cliente: solicitação de atendimento, anexos privados e distribuição.
create table if not exists public.client_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 160),
  phone text not null check (char_length(phone) between 8 and 50),
  subject text not null check (char_length(subject) between 5 and 180),
  description text not null check (char_length(description) between 10 and 3000),
  status text not null default 'novo' check (status in ('novo','em análise','aprovado')),
  contact_id uuid unique references public.contacts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_assignments (
  contact_id uuid not null references public.contacts(id) on delete cascade,
  staff_id uuid not null references public.profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (contact_id, staff_id)
);
create index if not exists client_assignments_staff_idx on public.client_assignments(staff_id, contact_id);

create table if not exists public.client_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  path text not null unique,
  file_name text not null check (char_length(file_name) between 1 and 255),
  content_type text not null check (content_type in ('application/pdf','image/jpeg','image/png','image/webp','image/gif','audio/mpeg','audio/mp4','audio/wav','audio/ogg','video/mp4','video/webm','video/quicktime')),
  size_bytes integer not null check (size_bytes between 1 and 52428800),
  created_at timestamptz not null default now(),
  check (left(path, 37) = user_id::text || '/')
);
create index if not exists client_documents_contact_idx on public.client_documents(contact_id, created_at desc);
create index if not exists client_documents_user_idx on public.client_documents(user_id, created_at desc);

create or replace function private.can_access_contact(target uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='owner')
    or exists(select 1 from public.profiles p join public.client_assignments a on a.staff_id=p.id
      where p.id=(select auth.uid()) and p.role='staff' and a.contact_id=target)
$$;
revoke all on function private.can_access_contact(uuid) from public, anon;
grant execute on function private.can_access_contact(uuid) to authenticated;

-- A pessoa que se cadastrou é a única capaz de alterar os dados de seu pedido.
-- Status e vínculo são imutáveis pelo titular, inclusive via API direta.
create or replace function private.protect_client_request()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.user_id is distinct from old.user_id or new.status is distinct from old.status
     or new.contact_id is distinct from old.contact_id then
    if not private.is_crm_owner() then
      raise exception 'Somente o administrador pode alterar o vínculo e a situação';
    end if;
  end if;
  new.updated_at=now();
  return new;
end;
$$;
drop trigger if exists client_request_protect on public.client_requests;
create trigger client_request_protect before update on public.client_requests
for each row execute function private.protect_client_request();

create or replace function private.protect_document()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.user_id is distinct from old.user_id or new.path is distinct from old.path
     or new.file_name is distinct from old.file_name or new.content_type is distinct from old.content_type
     or new.size_bytes is distinct from old.size_bytes then
    raise exception 'Documento imutável';
  end if;
  if new.contact_id is distinct from old.contact_id and not private.is_crm_owner() then
    raise exception 'Somente o administrador pode vincular documentos';
  end if;
  return new;
end;
$$;
drop trigger if exists client_document_protect on public.client_documents;
create trigger client_document_protect before update on public.client_documents
for each row execute function private.protect_document();

alter table public.client_requests enable row level security;
alter table public.client_assignments enable row level security;
alter table public.client_documents enable row level security;
create policy client_requests_select on public.client_requests for select to authenticated
using (user_id=(select auth.uid()) or private.is_crm_owner());
create policy client_requests_insert on public.client_requests for insert to authenticated
with check (user_id=(select auth.uid()) and status='novo' and contact_id is null
  and exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('pending','client')));
create policy client_requests_update on public.client_requests for update to authenticated
using (user_id=(select auth.uid()) or private.is_crm_owner())
with check (user_id=(select auth.uid()) or private.is_crm_owner());
create policy client_assignments_select on public.client_assignments for select to authenticated
using (staff_id=(select auth.uid()) or private.is_crm_owner());
create policy client_assignments_insert on public.client_assignments for insert to authenticated
with check (private.is_crm_owner() and exists
 (select 1 from public.profiles p where p.id=staff_id and p.role='staff'));
create policy client_assignments_delete on public.client_assignments for delete to authenticated
using (private.is_crm_owner());
create policy client_documents_select on public.client_documents for select to authenticated
using (user_id=(select auth.uid()) or private.is_crm_owner()
  or (contact_id is not null and private.can_access_contact(contact_id)));
create policy client_documents_insert on public.client_documents for insert to authenticated
with check (user_id=(select auth.uid())
  and (contact_id is null or contact_id=private.current_contact_id())
  and exists(select 1 from public.client_requests r where r.user_id=(select auth.uid())));
create policy client_documents_update on public.client_documents for update to authenticated
using (private.is_crm_owner()) with check (private.is_crm_owner());

-- Restringe os dados do escritório ao dono ou ao advogado designado.
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
using (id=(select auth.uid()) or private.is_crm_owner());
drop policy if exists contacts_read on public.contacts;
create policy contacts_read on public.contacts for select to authenticated
using (private.can_access_contact(id) or (kind='lead' and private.is_crm_staff()));
drop policy if exists contacts_staff_update on public.contacts;
create policy contacts_staff_update on public.contacts for update to authenticated
using (private.can_access_contact(id) or (kind='lead' and private.is_crm_staff()))
with check (private.can_access_contact(id) or (kind='lead' and private.is_crm_staff()));
drop policy if exists contacts_staff_delete on public.contacts;
create policy contacts_staff_delete on public.contacts for delete to authenticated
using (private.can_access_contact(id) or (kind='lead' and private.is_crm_staff()));
drop policy if exists cases_read on public.cases;
create policy cases_read on public.cases for select to authenticated
using (private.can_access_contact(contact_id) or (visible_to_client and contact_id=private.current_contact_id()));
drop policy if exists cases_staff_insert on public.cases;
create policy cases_staff_insert on public.cases for insert to authenticated with check (private.can_access_contact(contact_id));
drop policy if exists cases_staff_update on public.cases;
create policy cases_staff_update on public.cases for update to authenticated
using (private.can_access_contact(contact_id)) with check (private.can_access_contact(contact_id));
drop policy if exists cases_staff_delete on public.cases;
create policy cases_staff_delete on public.cases for delete to authenticated using (private.can_access_contact(contact_id));
drop policy if exists tasks_read on public.tasks;
create policy tasks_read on public.tasks for select to authenticated
using (private.can_access_contact(contact_id) or (visible_to_client and contact_id=private.current_contact_id()));
drop policy if exists tasks_staff_insert on public.tasks;
create policy tasks_staff_insert on public.tasks for insert to authenticated with check (private.can_access_contact(contact_id));
drop policy if exists tasks_staff_update on public.tasks;
create policy tasks_staff_update on public.tasks for update to authenticated
using (private.can_access_contact(contact_id)) with check (private.can_access_contact(contact_id));
drop policy if exists tasks_staff_delete on public.tasks;
create policy tasks_staff_delete on public.tasks for delete to authenticated using (private.can_access_contact(contact_id));
drop policy if exists contacts_staff_insert on public.contacts;
create policy contacts_staff_insert on public.contacts for insert to authenticated
with check (private.is_crm_owner() or (kind='lead' and private.is_crm_staff()));

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('client-documents','client-documents',false,52428800,array['application/pdf','image/jpeg','image/png','image/webp','image/gif','audio/mpeg','audio/mp4','audio/wav','audio/ogg','video/mp4','video/webm','video/quicktime'])
on conflict (id) do update set public=false, file_size_limit=52428800,
  allowed_mime_types=array['application/pdf','image/jpeg','image/png','image/webp','image/gif','audio/mpeg','audio/mp4','audio/wav','audio/ogg','video/mp4','video/webm','video/quicktime'];
create policy client_files_insert on storage.objects for insert to authenticated
with check (bucket_id='client-documents'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and exists(select 1 from public.client_requests r where r.user_id=(select auth.uid())));
create policy client_files_select on storage.objects for select to authenticated
using (bucket_id='client-documents'
  and ((storage.foldername(name))[1]=(select auth.uid())::text or private.is_crm_owner()
  or exists(select 1 from public.client_documents d
      where d.path=name and d.contact_id is not null and private.can_access_contact(d.contact_id))));

revoke all on public.client_requests,public.client_assignments,public.client_documents from anon;
grant select,insert,update on public.client_requests to authenticated;
grant select,insert,delete on public.client_assignments to authenticated;
grant select,insert,update on public.client_documents to authenticated;
