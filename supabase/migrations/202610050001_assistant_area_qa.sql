-- Respostas aprovadas por área para o assistente público.
create table if not exists public.assistant_area_qa (
  id uuid primary key default gen_random_uuid(),
  area_key text not null check (area_key in (
    'trabalhista','criminal','familia','civel','previdenciario','empresarial',
    'imobiliario','tributario','consumidor','lgpd','administrativo','internacional',
    'saude','outro'
  )),
  question text not null check (length(btrim(question)) between 8 and 240),
  keywords text not null default '' check (length(keywords) <= 400),
  answer text not null check (length(btrim(answer)) between 12 and 2500),
  is_published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assistant_area_qa_public_idx on public.assistant_area_qa(area_key, created_at)
  where is_published;

alter table public.assistant_area_qa enable row level security;
revoke all on table public.assistant_area_qa from public, anon, authenticated;
grant select on table public.assistant_area_qa to anon;
grant select, insert, update, delete on table public.assistant_area_qa to authenticated;

create policy assistant_area_qa_public_read on public.assistant_area_qa
  for select to anon using (is_published);
create policy assistant_area_qa_staff_read on public.assistant_area_qa
  for select to authenticated using (is_published or (select private.is_crm_admin()));
create policy assistant_area_qa_admin_insert on public.assistant_area_qa
  for insert to authenticated with check ((select private.is_crm_admin()));
create policy assistant_area_qa_admin_update on public.assistant_area_qa
  for update to authenticated using ((select private.is_crm_admin()))
  with check ((select private.is_crm_admin()));
create policy assistant_area_qa_admin_delete on public.assistant_area_qa
  for delete to authenticated using ((select private.is_crm_admin()));

insert into public.assistant_area_qa(area_key, question, keywords, answer, is_published)
values ('criminal', 'Como iniciar um atendimento com um advogado?',
  'falar com advogado; iniciar atendimento; contato',
  'Para iniciar o atendimento, use o botão “Iniciar atendimento nesta área”. Descreva sua situação e informe se há alguma intimação ou prazo. Um profissional do escritório analisará a solicitação.', true);
