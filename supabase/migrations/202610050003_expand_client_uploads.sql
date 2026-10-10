-- Permite que o portal receba os formatos de arquivo usados no atendimento.
alter table public.client_documents drop constraint if exists client_documents_content_type_check;
alter table public.client_documents add constraint client_documents_content_type_check
  check (content_type in (
    'application/pdf',
    'image/jpeg','image/png','image/webp','image/gif',
    'audio/mpeg','audio/mp4','audio/wav','audio/ogg',
    'video/mp4','video/webm','video/quicktime'
  ));

alter table public.client_documents drop constraint if exists client_documents_size_bytes_check;
alter table public.client_documents add constraint client_documents_size_bytes_check
  check (size_bytes between 1 and 52428800);

update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array[
      'application/pdf',
      'image/jpeg','image/png','image/webp','image/gif',
      'audio/mpeg','audio/mp4','audio/wav','audio/ogg',
      'video/mp4','video/webm','video/quicktime'
    ]
where id = 'client-documents';
