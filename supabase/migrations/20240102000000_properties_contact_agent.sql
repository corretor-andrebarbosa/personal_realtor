-- Campo interno: contato do agente parceiro
-- Visível apenas para service_role (admin). NUNCA exposto via anon key.
alter table public.properties
  add column if not exists contact_agent text;

-- Garante que anon key nunca leia este campo via RLS
-- (A tabela properties usa RLS? Se sim, a política anon só faz SELECT sem contact_agent)
-- Para garantia extra, revogar acesso ao campo via anon:
comment on column public.properties.contact_agent
  is 'Contato interno do agente parceiro. Nunca expor em queries públicas.';
