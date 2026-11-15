-- Planta baixa com captura de lead
-- ---------------------------------------------------------------------------
-- O visitante só recebe o link da planta depois de deixar o contato, e esse
-- contato entra na tabela `leads` (aba Leads do painel).
--
-- O que esta migração cria:
--   1. properties.has_floor_plan  → marcação pública (true/false). Não revela o link.
--   2. property_floor_plans       → guarda o link da planta. O visitante (anon) não lê.
--   3. leads.email / source / property_id / lang → dados estruturados do lead.
--   4. request_floor_plan(...)    → única saída do link para o visitante: valida o
--                                    formulário, grava o lead e só então devolve o link.
--
-- Pode ser executada mais de uma vez sem efeito colateral (idempotente).

begin;

-- 1) Marcação pública ---------------------------------------------------------
alter table public.properties
  add column if not exists has_floor_plan boolean not null default false;

comment on column public.properties.has_floor_plan is
  'true quando existe planta baixa em property_floor_plans. Mantido por trigger; não editar à mão.';

-- 2) Link da planta (privado) -------------------------------------------------
create table if not exists public.property_floor_plans (
  property_id bigint primary key references public.properties (id) on delete cascade,
  url         text not null check (url ~* '^https?://'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.property_floor_plans is
  'Link da planta baixa de cada imóvel. Fica fora de `properties` de propósito: o site público lê `properties` inteira, e o link só pode sair pela função request_floor_plan.';

alter table public.property_floor_plans enable row level security;

drop policy if exists "auth full property_floor_plans" on public.property_floor_plans;
create policy "auth full property_floor_plans" on public.property_floor_plans
  for all to authenticated using (true) with check (true);

-- Sem política para anon: o visitante não lê esta tabela. Reforço nos privilégios.
revoke all on public.property_floor_plans from anon;
grant select, insert, update, delete on public.property_floor_plans to authenticated;

-- Mantém properties.has_floor_plan em dia com a tabela acima.
create or replace function public.sync_has_floor_plan()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    update public.properties
       set has_floor_plan = true
     where id = new.property_id
       and has_floor_plan is distinct from true;
  end if;

  if tg_op = 'DELETE'
     or (tg_op = 'UPDATE' and old.property_id is distinct from new.property_id) then
    update public.properties
       set has_floor_plan = false
     where id = old.property_id
       and not exists (
         select 1 from public.property_floor_plans f where f.property_id = old.property_id
       );
  end if;

  return null;
end;
$$;

drop trigger if exists trg_sync_has_floor_plan on public.property_floor_plans;
create trigger trg_sync_has_floor_plan
  after insert or update or delete on public.property_floor_plans
  for each row execute function public.sync_has_floor_plan();

-- 3) Dados estruturados do lead -----------------------------------------------
alter table public.leads add column if not exists email text;
alter table public.leads add column if not exists source text;
alter table public.leads add column if not exists property_id bigint
  references public.properties (id) on delete set null;
alter table public.leads add column if not exists lang text;

comment on column public.leads.source is
  'Origem do lead. Ex.: planta_baixa (formulário da planta na página do imóvel).';
comment on column public.leads.lang is
  'Idioma em que o visitante navegava (pt, en, de, es).';

create index if not exists leads_source_created_at_idx
  on public.leads (source, created_at desc);

-- 4) Porta de saída do link ---------------------------------------------------
-- Roda com os privilégios do dono (security definer) para conseguir gravar o lead
-- e ler o link, coisas que o visitante não pode fazer direto nas tabelas.
-- Sempre devolve json: { ok: true, url } ou { ok: false, error: <código> }.
create or replace function public.request_floor_plan(
  p_property_id bigint,
  p_name        text,
  p_phone       text,
  p_email       text default null,
  p_consent     boolean default false,
  p_lang        text default 'pt'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name      text;
  v_raw_phone text;
  v_phone     text;
  v_email     text;
  v_lang      text;
  v_url       text;
  v_title     text;
  v_lead_id   bigint;
  v_recent    integer;
begin
  if p_consent is not true then
    return jsonb_build_object('ok', false, 'error', 'consent_required');
  end if;

  -- Nome: sem caracteres de controle nem sinais de marcação.
  v_name := btrim(regexp_replace(coalesce(p_name, ''), '[[:cntrl:]<>]', '', 'g'));
  if char_length(v_name) < 2 or char_length(v_name) > 80 then
    return jsonb_build_object('ok', false, 'error', 'invalid_name');
  end if;

  -- Telefone: guarda só dígitos, já com código do país (pronto para wa.me).
  --   "+49 151 ..." ou "0049 151 ..." → internacional, mantém como veio
  --   10 ou 11 dígitos sem "+"        → número brasileiro com DDD, recebe o 55
  v_raw_phone := btrim(coalesce(p_phone, ''));
  v_phone := regexp_replace(v_raw_phone, '\D', '', 'g');
  if v_raw_phone ~ '^\+' then
    null;
  elsif v_raw_phone ~ '^00' then
    v_phone := substr(v_phone, 3);
  elsif char_length(v_phone) in (10, 11) then
    v_phone := '55' || v_phone;
  end if;
  if char_length(v_phone) < 10 or char_length(v_phone) > 15 then
    return jsonb_build_object('ok', false, 'error', 'invalid_phone');
  end if;

  -- E-mail é opcional; se vier, precisa ter cara de e-mail.
  v_email := nullif(lower(btrim(coalesce(p_email, ''))), '');
  if v_email is not null
     and (char_length(v_email) > 120 or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$') then
    return jsonb_build_object('ok', false, 'error', 'invalid_email');
  end if;

  v_lang := lower(btrim(coalesce(p_lang, 'pt')));
  if v_lang not in ('pt', 'en', 'de', 'es') then
    v_lang := 'pt';
  end if;

  select f.url, p.title
    into v_url, v_title
    from public.property_floor_plans f
    join public.properties p on p.id = f.property_id
   where f.property_id = p_property_id;

  if v_url is null then
    return jsonb_build_object('ok', false, 'error', 'not_available');
  end if;

  -- Mesmo telefone pedindo a mesma planta nas últimas 24h: não duplica o lead.
  select l.id
    into v_lead_id
    from public.leads l
   where l.source = 'planta_baixa'
     and l.property_id = p_property_id
     and l.phone = v_phone
     and l.created_at > now() - interval '24 hours'
   order by l.created_at desc
   limit 1;

  if v_lead_id is null then
    -- Trava contra enxurrada automatizada de cadastros.
    select count(*)
      into v_recent
      from public.leads l
     where l.source = 'planta_baixa'
       and l.created_at > now() - interval '10 minutes';

    if v_recent >= 40 then
      return jsonb_build_object('ok', false, 'error', 'rate_limited');
    end if;

    insert into public.leads (name, phone, interest, status, email, source, property_id, lang)
    values (
      v_name,
      v_phone,
      'Planta baixa — ' || coalesce(nullif(btrim(v_title), ''), 'Imóvel #' || p_property_id),
      'Quente',
      v_email,
      'planta_baixa',
      p_property_id,
      v_lang
    );
  end if;

  return jsonb_build_object('ok', true, 'url', v_url);
end;
$$;

comment on function public.request_floor_plan(bigint, text, text, text, boolean, text) is
  'Formulário da planta baixa: valida os dados, grava o lead e devolve o link. Chamado pelo site público (anon).';

revoke all on function public.request_floor_plan(bigint, text, text, text, boolean, text) from public;
grant execute on function public.request_floor_plan(bigint, text, text, text, boolean, text) to anon, authenticated;

commit;

-- Faz a API (PostgREST) enxergar a coluna, a tabela e a função novas na hora.
notify pgrst, 'reload schema';
