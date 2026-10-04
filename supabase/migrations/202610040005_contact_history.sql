create table if not exists public.contact_history (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  event_type text not null default 'Alteração de etapa',
  old_stage text,
  new_stage text,
  body text not null default '',
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists contact_history_contact_created_idx on public.contact_history(contact_id, created_at desc);
alter table public.contact_history enable row level security;
drop policy if exists contact_history_staff_select on public.contact_history;
create policy contact_history_staff_select on public.contact_history for select to authenticated using (private.is_crm_staff());
revoke all on public.contact_history from anon;
grant select on public.contact_history to authenticated;

create or replace function public.contacts_audit_stage() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.stage is distinct from old.stage then
    insert into public.contact_history(contact_id,event_type,old_stage,new_stage,body,actor_id)
    values(new.id,'Alteração de etapa',old.stage,new.stage,format('Oportunidade movida de %s para %s.',coalesce(old.stage,'sem etapa'),coalesce(new.stage,'sem etapa')),auth.uid());
  end if;
  return new;
end; $$;
drop trigger if exists contacts_audit_stage on public.contacts;
create trigger contacts_audit_stage after update of stage on public.contacts for each row execute function public.contacts_audit_stage();
revoke all on function public.contacts_audit_stage() from public,anon,authenticated;
