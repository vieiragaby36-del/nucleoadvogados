-- Clientes criados pela triagem também podem anexar arquivos depois de entrar no portal.
drop policy if exists client_documents_insert on public.client_documents;
create policy client_documents_insert on public.client_documents for insert to authenticated
with check (
  user_id = (select auth.uid())
  and (contact_id is null or contact_id = private.current_contact_id())
  and (
    exists(select 1 from public.client_requests r where r.user_id = (select auth.uid()))
    or exists(select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'client' and p.contact_id is not null)
  )
);

drop policy if exists client_files_insert on storage.objects;
create policy client_files_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'client-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (
    exists(select 1 from public.client_requests r where r.user_id = (select auth.uid()))
    or exists(select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'client' and p.contact_id is not null)
  )
);
