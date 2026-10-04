alter table public.client_documents add column if not exists deleted_at timestamptz;
create index if not exists client_documents_deleted_idx on public.client_documents(deleted_at) where deleted_at is not null;
