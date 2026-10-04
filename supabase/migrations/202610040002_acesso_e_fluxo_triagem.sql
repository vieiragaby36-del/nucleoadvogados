-- Acesso criado na triagem e fluxo jurídico com responsáveis separados.

alter table public.profiles add column if not exists team_function text;
alter table public.profiles add column if not exists practice_area text;
update public.profiles set team_function = 'Advogado' where role in ('owner','staff') and team_function is null;
alter table public.profiles drop constraint if exists profiles_team_function_check;
alter table public.profiles add constraint profiles_team_function_check check (team_function is null or team_function in ('Advogado','Estagiário','Auxiliar'));

alter table public.attendances add column if not exists account_email text;
alter table public.attendances add column if not exists account_claim_token uuid;
update public.attendances set account_email = coalesce(account_email, ''), account_claim_token = coalesce(account_claim_token, gen_random_uuid()) where account_email is null or account_claim_token is null;
alter table public.attendances alter column account_email set not null;
alter table public.attendances alter column account_claim_token set not null;
create unique index if not exists attendances_account_claim_token_idx on public.attendances(account_claim_token);

alter table public.attendances add column if not exists triage_responsible_id uuid references public.profiles(id) on delete set null;
alter table public.attendances add column if not exists analysis_responsible_id uuid references public.profiles(id) on delete set null;
alter table public.attendances add column if not exists lawyer_responsible_id uuid references public.profiles(id) on delete set null;
alter table public.attendances add column if not exists priority text not null default 'Prioridade normal';
alter table public.attendances add column if not exists triage_notes text not null default '';
alter table public.attendances add column if not exists next_action text not null default '';
alter table public.attendances drop constraint if exists attendances_status_check;
alter table public.attendances add constraint attendances_status_check check (status in ('Novo atendimento','Em triagem','Em análise','Aguardando validação do advogado','Em atendimento','Aguardando cliente','Concluído','Cancelado'));
alter table public.attendances add constraint attendances_priority_check check (priority in ('Urgente','Prioridade normal','Baixa'));
alter table public.attendances add constraint attendances_next_action_check check (next_action in ('','Solicitar documentos','Entrar em contato','Agendar reunião','Elaborar parecer','Encaminhar ao advogado','Encerrar demanda'));
create index if not exists attendances_priority_idx on public.attendances(priority);

alter table public.attendance_history drop constraint if exists attendance_history_event_type_check;
alter table public.attendance_history add constraint attendance_history_event_type_check check (event_type in ('Criação do atendimento','Alteração de status','Alteração de responsável','Alteração de prioridade','Definição de próxima ação','Parecer interno','Observação interna','Solicitação de documentos'));

drop function if exists public.submit_public_attendance(text,text,text,text,text,text,uuid);
create or replace function public.submit_public_attendance(p_name text,p_phone text,p_city_uf text,p_demand_area text,p_cause_description text,p_has_documents text,p_email text,p_submission_key uuid,p_account_claim_token uuid)
returns table(attendance_id uuid,attendance_number text) language plpgsql security definer set search_path = '' as $$
declare v_name text:=btrim(coalesce(p_name,'')); v_phone text:=regexp_replace(coalesce(p_phone,''),'[^0-9]','','g'); v_city text:=btrim(coalesce(p_city_uf,'')); v_area text:=btrim(coalesce(p_demand_area,'')); v_description text:=btrim(coalesce(p_cause_description,'')); v_documents text:=btrim(coalesce(p_has_documents,'')); v_email text:=lower(btrim(coalesce(p_email,''))); v_contact_id uuid; v_attendance_id uuid; v_number text;
begin
  if p_submission_key is null or p_account_claim_token is null then raise exception 'Identificador de envio inválido.' using errcode='22023'; end if;
  if char_length(v_name)<2 or char_length(v_name)>160 then raise exception 'Informe seu nome.' using errcode='22023'; end if;
  if v_phone !~ '^[0-9]{10,11}$' then raise exception 'Informe um WhatsApp válido com DDD.' using errcode='22023'; end if;
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Informe um e-mail válido.' using errcode='22023'; end if;
  if char_length(v_city)<2 or char_length(v_city)>120 then raise exception 'Informe sua cidade e UF.' using errcode='22023'; end if;
  if v_area not in ('Trabalhista','Família e Sucessões','Cível','Previdenciário','Empresarial','Imobiliário','Criminal','Tributário','Consumidor','Outro') then raise exception 'Selecione a área da demanda.' using errcode='22023'; end if;
  if char_length(v_description)<10 or char_length(v_description)>6000 then raise exception 'Conte um pouco mais sobre o que aconteceu.' using errcode='22023'; end if;
  if v_documents not in ('Sim','Não','Não sei') then raise exception 'Informe se já possui documentos.' using errcode='22023'; end if;
  select a.id,a.attendance_number into v_attendance_id,v_number from public.attendances a where a.submission_key=p_submission_key;
  if found then return query select v_attendance_id,v_number; return; end if;
  begin
    insert into public.contacts(name,phone,kind,stage,source,notes) values(v_name,v_phone,'lead','novo','Site · Triagem inicial','Atendimento criado pela triagem pública.') returning id into v_contact_id;
    v_number:=format('ATD-%s-%s',to_char(current_date,'YYYY'),lpad(nextval('public.attendance_number_seq')::text,4,'0'));
    insert into public.attendances(attendance_number,submission_key,contact_id,city_uf,demand_area,cause_description,has_documents,status,source,account_email,account_claim_token) values(v_number,p_submission_key,v_contact_id,v_city,v_area,v_description,v_documents,'Novo atendimento','Site',v_email,p_account_claim_token) returning id into v_attendance_id;
    insert into public.attendance_history(attendance_id,event_type,body) values(v_attendance_id,'Criação do atendimento','Atendimento recebido pelo site.');
  exception when unique_violation then select a.id,a.attendance_number into v_attendance_id,v_number from public.attendances a where a.submission_key=p_submission_key; if not found then raise; end if;
  end;
  return query select v_attendance_id,v_number;
end; $$;

create or replace function public.claim_attendance_access(p_attendance_id uuid,p_account_claim_token uuid)
returns table(contact_id uuid,attendance_number text) language plpgsql security definer set search_path = '' as $$
declare v_email text:=lower(coalesce(auth.jwt()->>'email','')); v_contact_id uuid; v_number text;
begin
  if auth.uid() is null or p_attendance_id is null or p_account_claim_token is null or v_email='' then raise exception 'Acesso não autorizado.' using errcode='42501'; end if;
  select a.contact_id,a.attendance_number into v_contact_id,v_number from public.attendances a where a.id=p_attendance_id and a.account_claim_token=p_account_claim_token and a.account_email=v_email;
  if not found then raise exception 'Não foi possível vincular este atendimento à sua conta.' using errcode='42501'; end if;
  update public.contacts set email=v_email,kind='client' where id=v_contact_id;
  update public.profiles set role='client',contact_id=v_contact_id where id=auth.uid();
  return query select v_contact_id,v_number;
end; $$;

create or replace function public.attendances_audit_changes() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_actor uuid:=auth.uid(); v_old_name text; v_new_name text;
begin
  new.updated_at:=now();
  if new.status is distinct from old.status then insert into public.attendance_history(attendance_id,event_type,body,actor_id) values(new.id,'Alteração de status',format('Status alterado de %s para %s.',old.status,new.status),v_actor); end if;
  if new.priority is distinct from old.priority then insert into public.attendance_history(attendance_id,event_type,body,actor_id) values(new.id,'Alteração de prioridade',format('Prioridade alterada de %s para %s.',old.priority,new.priority),v_actor); end if;
  if new.next_action is distinct from old.next_action then insert into public.attendance_history(attendance_id,event_type,body,actor_id) values(new.id,'Definição de próxima ação',format('Próxima ação definida: %s.',coalesce(nullif(new.next_action,''),'nenhuma')),v_actor); end if;
  foreach v_old_name in array array['assigned_staff_id','triage_responsible_id','analysis_responsible_id','lawyer_responsible_id'] loop
    if (to_jsonb(new)->>v_old_name) is distinct from (to_jsonb(old)->>v_old_name) then
      select coalesce(full_name,email,'Não atribuído') into v_new_name from public.profiles where id=(to_jsonb(new)->>v_old_name)::uuid;
      insert into public.attendance_history(attendance_id,event_type,body,actor_id) values(new.id,'Alteração de responsável',format('%s atualizado para %s.',case v_old_name when 'assigned_staff_id' then 'Responsável pelo atendimento' when 'triage_responsible_id' then 'Responsável pela triagem' when 'analysis_responsible_id' then 'Responsável pela análise' else 'Advogado responsável' end,coalesce(v_new_name,'Não atribuído')),v_actor);
    end if;
  end loop;
  return new;
end; $$;

drop policy if exists attendances_staff_select on public.attendances;
create policy attendances_staff_select on public.attendances for select to authenticated using (public.crm_staff_access() or contact_id=private.current_contact_id());
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using (auth.uid()=id or private.is_crm_staff());

revoke all on function public.submit_public_attendance(text,text,text,text,text,text,text,uuid,uuid) from public;
grant execute on function public.submit_public_attendance(text,text,text,text,text,text,text,uuid,uuid) to anon,authenticated;
revoke all on function public.claim_attendance_access(uuid,uuid) from public,anon;
grant execute on function public.claim_attendance_access(uuid,uuid) to authenticated;
revoke all on function public.attendances_audit_changes() from public,anon,authenticated;
