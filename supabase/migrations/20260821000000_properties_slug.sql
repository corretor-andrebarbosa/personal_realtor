-- URLs otimizadas para SEO: cada imóvel passa a ter um slug descritivo
-- (estado + cidade + bairro + quartos + destaque + id), em vez de só o id numérico.
-- Ex.: /properties/pb-joao-pessoa-jardim-oceania-3-quartos-vista-mar-definitiva-e-panoramica-4
--
-- "slug"          — URL final, única, sempre terminando no id (garante unicidade
--                    e mantém a URL antiga /properties/4 resolvendo o imóvel certo).
-- "slug_feature"  — só o trecho de destaque (o diferencial do anúncio). Editável
--                    no formulário do site; aqui é preenchido automaticamente a
--                    partir do título, como ponto de partida pra você refinar depois.

create extension if not exists unaccent;

alter table public.properties add column if not exists slug text;
alter table public.properties add column if not exists slug_feature text;

create or replace function public.slugify(v text) returns text as $$
  select trim(both '-' from
    regexp_replace(
      regexp_replace(
        lower(unaccent(coalesce(v, ''))),
        '[^a-z0-9]+', '-', 'g'
      ),
      '-{2,}', '-', 'g'
    )
  );
$$ language sql immutable;

-- Separa "Bairro, Cidade - Estado" nas três partes. Aceita formatos parciais
-- (sem estado, sem vírgula etc.) sem quebrar.
create or replace function public.parse_property_address(addr text)
returns table(neighborhood text, city text, state text) as $$
declare
  parts text[];
  rest text;
  last_dash int;
begin
  parts := string_to_array(coalesce(addr, ''), ',');
  neighborhood := trim(coalesce(parts[1], ''));
  rest := trim(coalesce(parts[2], ''));
  last_dash := strpos(reverse(rest), '-');
  if last_dash > 0 then
    city := trim(substring(rest from 1 for length(rest) - last_dash));
    state := trim(substring(rest from length(rest) - last_dash + 2));
  else
    city := rest;
    state := '';
  end if;
  return next;
end;
$$ language plpgsql immutable;

-- Sugestão automática de destaque a partir do título — remove conectivos e o
-- que já é redundante com tipo/quartos, e corta em ~45 caracteres. É só o
-- ponto de partida do backfill; edite o campo "Destaque" no site quando quiser
-- um resumo mais certeiro (ex.: "vista mar definitiva e panoramica").
create or replace function public.suggest_slug_feature(title text, ptype text, prooms int)
returns text as $$
declare
  stopwords text[] := array['de','da','do','das','dos','com','para','por','em','no','na',
                             'nos','nas','e','o','a','os','as','um','uma','uns','umas',
                             'ao','aos','que','se'];
  type_slug text := public.slugify(coalesce(ptype, ''));
  feature text := public.slugify(coalesce(title, ''));
  w text;
  out_words text[] := '{}';
begin
  foreach w in array string_to_array(feature, '-') loop
    if w = '' or w = any(stopwords) or w = type_slug then
      continue;
    end if;
    out_words := array_append(out_words, w);
  end loop;
  feature := array_to_string(out_words, '-');

  if coalesce(prooms, 0) > 0 then
    feature := trim(both '-' from regexp_replace(feature, '(^|-)' || prooms || '-quartos(-|$)', '\1'));
  end if;

  if length(feature) > 45 then
    feature := regexp_replace(substring(feature from 1 for 45), '-[^-]*$', '');
  end if;

  return feature;
end;
$$ language plpgsql immutable;

-- Backfill dos imóveis já cadastrados que ainda não têm slug
with parsed as (
  select p.id,
         pa.state, pa.city, pa.neighborhood,
         case when coalesce(p.rooms, 0) > 0 then p.rooms::text || ' quartos' else null end as rooms_part,
         nullif(public.suggest_slug_feature(p.title, p.type, p.rooms), '') as feature
  from public.properties p
  cross join lateral public.parse_property_address(p.address) pa
  where p.slug is null
)
update public.properties prop
set slug = coalesce(
      nullif(
        trim(both '-' from
          array_to_string(
            array_remove(
              array[
                nullif(public.slugify(concat_ws(' ', parsed.state, parsed.city, parsed.neighborhood, parsed.rooms_part)), ''),
                parsed.feature
              ],
              null
            ),
            '-'
          )
        ),
        ''
      ),
      nullif(public.slugify(prop.title), ''),
      'imovel'
    ) || '-' || parsed.id,
    slug_feature = parsed.feature
from parsed
where parsed.id = prop.id;

create unique index if not exists properties_slug_key on public.properties (slug);
