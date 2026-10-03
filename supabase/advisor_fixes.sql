create index if not exists tasks_case_contact_idx on public.tasks(case_id, contact_id);

drop policy if exists profiles_read_own on public.profiles;
drop policy if exists profiles_staff_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using ((select auth.uid())=id or private.is_crm_staff());

drop policy if exists contacts_staff_all on public.contacts;
drop policy if exists contacts_client_read on public.contacts;
create policy contacts_read on public.contacts for select to authenticated using (private.is_crm_staff() or id=private.current_contact_id());
create policy contacts_staff_insert on public.contacts for insert to authenticated with check (private.is_crm_staff());
create policy contacts_staff_update on public.contacts for update to authenticated using (private.is_crm_staff()) with check (private.is_crm_staff());
create policy contacts_staff_delete on public.contacts for delete to authenticated using (private.is_crm_staff());

drop policy if exists cases_staff_all on public.cases;
drop policy if exists cases_client_read on public.cases;
create policy cases_read on public.cases for select to authenticated using (private.is_crm_staff() or (visible_to_client and contact_id=private.current_contact_id()));
create policy cases_staff_insert on public.cases for insert to authenticated with check (private.is_crm_staff());
create policy cases_staff_update on public.cases for update to authenticated using (private.is_crm_staff()) with check (private.is_crm_staff());
create policy cases_staff_delete on public.cases for delete to authenticated using (private.is_crm_staff());

drop policy if exists tasks_staff_all on public.tasks;
drop policy if exists tasks_client_read on public.tasks;
create policy tasks_read on public.tasks for select to authenticated using (private.is_crm_staff() or (visible_to_client and contact_id=private.current_contact_id()));
create policy tasks_staff_insert on public.tasks for insert to authenticated with check (private.is_crm_staff());
create policy tasks_staff_update on public.tasks for update to authenticated using (private.is_crm_staff()) with check (private.is_crm_staff());
create policy tasks_staff_delete on public.tasks for delete to authenticated using (private.is_crm_staff());
