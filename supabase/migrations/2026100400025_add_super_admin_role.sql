-- Enumeração aplicada antes das políticas que utilizam o novo nível.
alter type public.crm_role add value if not exists 'super_admin';
