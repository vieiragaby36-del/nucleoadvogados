-- Keep the public triage options aligned with the assistant's practice areas.
-- Retain the old labels so existing attendances remain valid.
alter table public.attendances
  drop constraint if exists attendances_demand_area_check;

alter table public.attendances
  add constraint attendances_demand_area_check
  check (demand_area in (
    'Trabalhista', 'Criminal', 'Família e Sucessões', 'Cível e Contencioso',
    'Previdenciário', 'Empresarial e Societário', 'Imobiliário', 'Tributário',
    'Consumidor', 'Compliance e LGPD', 'Administrativo e Licitações',
    'Internacional e Arbitragem', 'Saúde', 'Outro assunto',
    'Cível', 'Empresarial', 'Outro'
  ));

-- Patch only the whitelist, preserving all other live RPC behavior.
do $$
declare
  function_definition text;
  previous_areas text := '''Trabalhista'',''Família e Sucessões'',''Cível'',''Previdenciário'',''Empresarial'',''Imobiliário'',''Criminal'',''Tributário'',''Consumidor'',''Outro''';
  supported_areas text := '''Trabalhista'',''Criminal'',''Família e Sucessões'',''Cível e Contencioso'',''Previdenciário'',''Empresarial e Societário'',''Imobiliário'',''Tributário'',''Consumidor'',''Compliance e LGPD'',''Administrativo e Licitações'',''Internacional e Arbitragem'',''Saúde'',''Outro assunto'',''Cível'',''Empresarial'',''Outro''';
begin
  select pg_get_functiondef(p.oid)
    into function_definition
    from pg_proc p
    where p.proname = 'submit_public_attendance'
      and p.pronamespace = 'public'::regnamespace
      and p.pronargs = 9;

  if function_definition is null then
    raise exception 'submit_public_attendance RPC is missing';
  end if;
  if position(previous_areas in function_definition) > 0 then
    execute replace(function_definition, previous_areas, supported_areas);
  elsif position(supported_areas in function_definition) = 0 then
    raise exception 'Unexpected attendance area validation; review RPC before applying';
  end if;
end $$;
