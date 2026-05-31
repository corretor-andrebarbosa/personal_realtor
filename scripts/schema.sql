-- Execute este SQL no novo projeto Supabase: SQL Editor → New query → Run
-- Cria todas as tabelas necessárias para a plataforma André Barbosa Imóveis

-- ── properties ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS properties (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz DEFAULT now(),
  title         text,
  description   text,
  address       text,
  type          text,
  contract      text,           -- 'venda' | 'locacao' | 'ambos'
  status        text DEFAULT 'Disponível',
  price         numeric,
  sale_price    numeric,
  rental_price  numeric,
  area          numeric,
  total_area    numeric,
  m2            numeric,
  square_meters numeric,
  rooms         integer,
  bathrooms     integer,
  garage        integer,
  images        jsonb,
  gallery       jsonb,
  image         text,
  image_url     text,
  main_image    text,
  video_link    text,
  video_url     text,
  video         text,
  price_type    text DEFAULT 'fixo',
  caucao        boolean DEFAULT false,
  fiador        boolean DEFAULT false
);

-- ── leads ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz DEFAULT now(),
  name        text,
  phone       text,
  email       text,
  message     text,
  status      text,
  source      text,
  property_id uuid,
  notes       text,
  updated_at  timestamptz DEFAULT now()
);

-- ── people ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS people (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz DEFAULT now(),
  name        text,
  phone       text,
  email       text,
  type        text,           -- 'cliente' | 'proprietario' | 'parceiro'
  notes       text,
  updated_at  timestamptz DEFAULT now()
);

-- ── blog_posts ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blog_posts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz DEFAULT now(),
  title       text,
  slug        text UNIQUE,
  content     text,
  excerpt     text,
  image       text,
  published   boolean DEFAULT false,
  updated_at  timestamptz DEFAULT now()
);

-- ── site_settings ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_settings (
  id          text PRIMARY KEY DEFAULT 'default',
  updated_at  timestamptz DEFAULT now(),
  whatsapp    text,
  instagram   text,
  facebook    text,
  email       text,
  address     text,
  creci       text,
  broker_name text,
  logo_url    text,
  primary_color text,
  meta        jsonb
);

-- ── whatsapp_matches ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_matches (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz DEFAULT now(),
  sender_name         text,
  sender_phone        text,
  group_name          text,
  message             text,
  intent              jsonb,
  matched_properties  jsonb,
  read                boolean DEFAULT false
);

-- ── RLS: todas as tabelas acessíveis para authenticated (admin da plataforma) ─
ALTER TABLE properties       ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads            ENABLE ROW LEVEL SECURITY;
ALTER TABLE people           ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_matches ENABLE ROW LEVEL SECURITY;

-- Acesso público de leitura para properties e blog_posts (site público)
CREATE POLICY "public read properties"  ON properties  FOR SELECT TO anon USING (true);
CREATE POLICY "public read blog_posts"  ON blog_posts  FOR SELECT TO anon USING (true);
CREATE POLICY "public read site_settings" ON site_settings FOR SELECT TO anon USING (true);

-- Acesso total para usuários autenticados (admin)
CREATE POLICY "auth full properties"       ON properties       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth full leads"            ON leads            FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth full people"           ON people           FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth full blog_posts"       ON blog_posts       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth full site_settings"    ON site_settings    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth full whatsapp_matches" ON whatsapp_matches FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Service role (whatsapp-monitor) acesso total
CREATE POLICY "service full whatsapp_matches" ON whatsapp_matches FOR ALL TO service_role USING (true) WITH CHECK (true);
