-- Triagem pública → atendimento único no CRM.
-- Aplicada no projeto Supabase em 2026-10-04.

create sequence if not exists public.attendance_number_seq start with 1 increment by 1;

create table if not exists public.attendances (
  id uuid primary key default gen_random_uuid(),
  attendance_number text not null unique,
  submission_key uuid not null unique,
  contact_id uuid not null references public.contacts(id) on delete restrict,
  city_uf text not null check (char_length(city_uf) between 2 and 120),
  demand_area text not null check (demand_area in ('Trabalhista','Família e Sucessões','Cível','Previdenciário','Empresarial','Imobiliário','Criminal','Tributário','Consumidor','Outro')),
  cause_description text not null check (char_length(cause_description) between 10 and 6000),
  has_documents text not null check (has_documents in ('Sim','Não','Não sei')),
  status text not null default 'Novo atendimento' check (status in ('Novo atendimento','Em análise','Em atendimento','Aguardando cliente','Concluído','Cancelado')),
  source text not null default 'Site' check (source = 'Site'),
  assigned_staff_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.attendance_history (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null references public.attendances(id) on delete cascade,
  event_type text not null check (event_type in ('Criação do atendimento','Alteração de status','Alteração de responsável','Observação interna','Solicitação de documentos')),
  body text not null default '', actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists attendances_created_at_idx on public.attendances(created_at desc);
create index if not exists attendances_status_idx on public.attendances(status);
create index if not exists attendance_history_attendance_id_idx on public.attendance_history(attendance_id, created_at asc);

create or replace function public.crm_staff_access() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('owner','staff'));
$$;

create or replace function public.attendances_audit_changes() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_old_name text; v_new_name text;
begin
  new.updated_at := now();
  if new.status is distinct from old.status then insert into public.attendance_history(attendance_id,event_type,body,actor_id) values(new.id,'Alteração de status',format('Status alterado de %s para %s.',old.status,new.status),v_actor); end if;
  if new.assigned_staff_id is distinct from old.assigned_staff_id then
    select coalesce(full_name,email,'Não atribuído') into v_old_name from public.profiles where id=old.assigned_staff_id;
    select coalesce(full_name,email,'Não atribuído') into v_new_name from public.profiles where id=new.assigned_staff_id;
    insert into public.attendance_history(attendance_id,event_type,body,actor_id) values(new.id,'Alteração de responsável',format('Responsável alterado de %s para %s.',coalesce(v_old_name,'Não atribuído'),coalesce(v_new_name,'Não atribuído')),v_actor);
  end if;
  return new;
end; $$;
drop trigger if exists attendances_audit_changes on public.attendances;
create trigger attendances_audit_changes before update on public.attendances for each row execute function public.attendances_audit_changes();

create or replace function public.submit_public_attendance(p_name text,p_phone text,p_city_uf text,p_demand_area text,p_cause_description text,p_has_documents text,p_submission_key uuid)
returns table(attendance_id uuid,attendance_number text) language plpgsql security definer set search_path = '' as $$
declare v_name text:=btrim(coalesce(p_name,'')); v_phone text:=regexp_replace(coalesce(p_phone,''),'[^0-9]','','g'); v_city text:=btrim(coalesce(p_city_uf,'')); v_area text:=btrim(coalesce(p_demand_area,'')); v_description text:=btrim(coalesce(p_cause_description,'')); v_documents text:=btrim(coalesce(p_has_documents,'')); v_contact_id uuid; v_attendance_id uuid; v_number text;
begin
  if p_submission_key is null then raise exception 'Identificador de envio inválido.' using errcode='22023'; end if;
  if char_length(v_name)<2 or char_length(v_name)>160 then raise exception 'Informe seu nome.' using errcode='22023'; end if;
  if v_phone !~ '^[0-9]{10,11}$' then raise exception 'Informe um WhatsApp válido com DDD.' using errcode='22023'; end if;
  if char_length(v_city)<2 or char_length(v_city)>120 then raise exception 'Informe sua cidade e UF.' using errcode='22023'; end if;
  if v_area not in ('Trabalhista','Família e Sucessões','Cível','Previdenciário','Empresarial','Imobiliário','Criminal','Tributário','Consumidor','Outro') then raise exception 'Selecione a área da demanda.' using errcode='22023'; end if;
  if char_length(v_description)<10 or char_length(v_description)>6000 then raise exception 'Conte um pouco mais sobre o que aconteceu.' using errcode='22023'; end if;
  if v_documents not in ('Sim','Não','Não sei') then raise exception 'Informe se já possui documentos.' using errcode='22023'; end if;
  select a.id,a.attendance_number into v_attendance_id,v_number from public.attendances a where a.submission_key=p_submission_key;
  if found then return query select v_attendance_id,v_number; return; end if;
  begin
    insert into public.contacts(name,phone,kind,stage,source,notes) values(v_name,v_phone,'lead','novo','Site · Triagem inicial','Atendimento criado pela triagem pública.') returning id into v_contact_id;
    v_number:=format('ATD-%s-%s',to_char(current_date,'YYYY'),lpad(nextval('public.attendance_number_seq')::text,4,'0'));
    insert into public.attendances(attendance_number,submission_key,contact_id,city_uf,demand_area,cause_description,has_documents,status,source) values(v_number,p_submission_key,v_contact_id,v_city,v_area,v_description,v_documents,'Novo atendimento','Site') returning id into v_attendance_id;
    insert into public.attendance_history(attendance_id,event_type,body) values(v_attendance_id,'Criação do atendimento','Atendimento recebido pelo site.');
  exception when unique_violation then select a.id,a.attendance_number into v_attendance_id,v_number from public.attendances a where a.submission_key=p_submission_key; if not found then raise; end if;
  end;
  return query select v_attendance_id,v_number;
end; $$;

alter table public.attendances enable row level security;
alter table public.attendance_history enable row level security;
create policy attendances_staff_select on public.attendances for select to authenticated using (public.crm_staff_access());
create policy attendances_staff_update on public.attendances for update to authenticated using (public.crm_staff_access()) with check (public.crm_staff_access());
create policy attendance_history_staff_select on public.attendance_history for select to authenticated using (public.crm_staff_access());
create policy attendance_history_staff_insert on public.attendance_history for insert to authenticated with check (public.crm_staff_access());
grant select,update on public.attendances to authenticated;
grant select,insert on public.attendance_history to authenticated;
revoke all on public.attendances,public.attendance_history from anon;
revoke all on function public.attendances_audit_changes() from public,anon,authenticated;
revoke all on function public.submit_public_attendance(text,text,text,text,text,text,uuid) from public;
grant execute on function public.submit_public_attendance(text,text,text,text,text,text,uuid) to anon,authenticated;
revoke all on function public.crm_staff_access() from public,anon;
grant execute on function public.crm_staff_access() to authenticated;
