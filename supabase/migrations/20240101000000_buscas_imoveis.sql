create table if not exists public.buscas_imoveis (
  id          uuid primary key default gen_random_uuid(),
  params      jsonb not null,
  resultados  jsonb not null,
  criado_em   timestamptz not null default now()
);

create index buscas_imoveis_criado_em_idx
  on public.buscas_imoveis (criado_em desc);

alter table public.buscas_imoveis enable row level security;

create policy "service_role full access"
  on public.buscas_imoveis
  using (auth.role() = 'service_role');
