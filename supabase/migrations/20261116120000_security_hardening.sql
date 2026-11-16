-- Endurecimento de segurança (auditoria 2026-11-16)
--
-- 1. Só administradores cadastrados em public.admin_users acessam os dados do painel
--    (antes: qualquer usuário autenticado, inclusive alguém que se cadastrasse sozinho).
-- 2. Visitantes não leem mais as chaves Gemini/Groq nem o prompt do assistente.
-- 3. Visitantes só veem imóveis não ocultos e posts publicados.
-- 4. Formulário de contato da home grava o lead via RPC validada
--    (o insert direto com .select() era recusado pelo RLS e o lead se perdia).
-- 5. search_path fixo nas funções de slug (alerta do Supabase advisor).
--
-- Aplicar SOMENTE depois que o front-end deste PR estiver publicado:
-- o código antigo lê site_settings com select('*') como visitante.

-- ── 1. administradores ─────────────────────────────────────────────────────────
create table if not exists public.admin_users (
    user_id uuid primary key references auth.users (id) on delete cascade,
    created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon, authenticated;

-- Hoje existe uma única conta (a do corretor): ela vira administradora.
insert into public.admin_users (user_id)
select id from auth.users
on conflict do nothing;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

do $$
declare
    t text;
begin
    foreach t in array array[
        'blog_posts', 'dashboard_config', 'leads', 'partners', 'people', 'profiles',
        'properties', 'property_floor_plans', 'site_settings', 'whatsapp_matches'
    ] loop
        execute format(
            'alter policy %I on public.%I using ((select public.is_admin())) with check ((select public.is_admin()))',
            'auth full ' || t, t
        );
    end loop;
end $$;

alter policy "auth_read" on public.visits using ((select public.is_admin()));

alter policy "admin read sales-tables" on storage.objects
    using (bucket_id = 'sales-tables' and (select public.is_admin()));
alter policy "admin update sales-tables" on storage.objects
    using (bucket_id = 'sales-tables' and (select public.is_admin()));
alter policy "admin delete sales-tables" on storage.objects
    using (bucket_id = 'sales-tables' and (select public.is_admin()));
alter policy "admin upload sales-tables" on storage.objects
    with check (bucket_id = 'sales-tables' and (select public.is_admin()));

-- ── 2. site_settings: visitante lê só o que é público ─────────────────────────
revoke select on public.site_settings from anon;
grant select (id, updated_at, whatsapp, telegram, socials, primary_color) on public.site_settings to anon;

-- ── 3. conteúdo público ───────────────────────────────────────────────────────
alter policy "public read properties" on public.properties
    using (coalesce(hidden, false) = false);
alter policy "public read blog_posts" on public.blog_posts
    using (status = 'published');

-- visitas: limita o tamanho do que o visitante grava
alter policy "anon_insert" on public.visits
    with check (
        length(coalesce(page, '')) <= 200
        and length(coalesce(referrer, '')) <= 500
        and length(coalesce(device, '')) <= 40
    );

-- ── 4. lead do formulário de contato ──────────────────────────────────────────
create or replace function public.submit_contact_lead(
    p_name text,
    p_phone text,
    p_interest text default null,
    p_email text default null,
    p_lang text default 'pt'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_name text := btrim(regexp_replace(coalesce(p_name, ''), '[[:cntrl:]<>]', '', 'g'));
    v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
    v_interest text := left(btrim(regexp_replace(coalesce(p_interest, ''), '[[:cntrl:]<>]', '', 'g')), 300);
    v_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
    v_lang text := case when p_lang in ('pt', 'en', 'de', 'es') then p_lang else 'pt' end;
begin
    if char_length(v_name) not between 2 and 80 then
        return jsonb_build_object('ok', false, 'error', 'invalid_name');
    end if;
    if length(v_phone) not between 10 and 15 then
        return jsonb_build_object('ok', false, 'error', 'invalid_phone');
    end if;
    if length(v_phone) <= 11 then
        v_phone := '55' || v_phone;
    end if;
    if v_email is not null and (length(v_email) > 120 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
        return jsonb_build_object('ok', false, 'error', 'invalid_email');
    end if;

    -- trava contra robôs: no máximo 40 leads do site em 10 minutos
    if (select count(*) from public.leads
        where source = 'site' and created_at > now() - interval '10 minutes') >= 40 then
        return jsonb_build_object('ok', false, 'error', 'rate_limited');
    end if;

    -- mesmo telefone em 24h: não duplica
    if exists (select 1 from public.leads
               where source = 'site' and phone = v_phone
                 and created_at > now() - interval '24 hours') then
        return jsonb_build_object('ok', true);
    end if;

    insert into public.leads (name, phone, email, interest, status, source, lang)
    values (v_name, v_phone, v_email, coalesce(nullif(v_interest, ''), 'Site público'),
            'Quente', 'site', v_lang);

    return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.submit_contact_lead(text, text, text, text, text) from public;
grant execute on function public.submit_contact_lead(text, text, text, text, text) to anon, authenticated;

-- ── 5. search_path fixo ───────────────────────────────────────────────────────
alter function public.slugify(text) set search_path = public, extensions, pg_temp;
alter function public.parse_property_address(text) set search_path = public, extensions, pg_temp;
alter function public.suggest_slug_feature(text, text, integer) set search_path = public, extensions, pg_temp;

notify pgrst, 'reload schema';
