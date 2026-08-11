-- Adiciona campo de Telegram (usuário, sem @) às configurações do site
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS telegram text;
