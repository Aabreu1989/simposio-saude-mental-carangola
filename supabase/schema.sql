-- ==============================================================================
-- 1º Simpósio de Saúde Mental - Microrregião de Carangola / MG
-- Esquema Oficial de Banco de Dados Supabase (PostgreSQL)
-- ==============================================================================

-- 1. Tabela de Inscrições / Participantes
CREATE TABLE IF NOT EXISTS public.registrations (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    cpf TEXT NOT NULL,
    phone TEXT NOT NULL,
    city TEXT NOT NULL,
    institution TEXT NOT NULL,
    professional_role TEXT NOT NULL,
    sus_care_level TEXT,
    registration_date TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pendente', -- 'Pendente' | 'Confirmado' | 'Presente' | 'Cancelado'
    attended BOOLEAN NOT NULL DEFAULT false,
    checked_in_at TIMESTAMPTZ,
    certificate_issued BOOLEAN NOT NULL DEFAULT false,
    badge_printed BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    origin TEXT DEFAULT 'portal',
    instagram TEXT,
    linkedin TEXT,
    other_social TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices para busca ágil
CREATE INDEX IF NOT EXISTS idx_registrations_code ON public.registrations(code);
CREATE INDEX IF NOT EXISTS idx_registrations_cpf ON public.registrations(cpf);
CREATE INDEX IF NOT EXISTS idx_registrations_email ON public.registrations(email);
CREATE INDEX IF NOT EXISTS idx_registrations_city ON public.registrations(city);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON public.registrations(status);

-- 2. Tabela de Configurações Globais do Evento
CREATE TABLE IF NOT EXISTS public.event_config (
    id TEXT PRIMARY KEY DEFAULT 'current_event',
    title TEXT NOT NULL,
    edition_label TEXT NOT NULL,
    theme TEXT NOT NULL,
    event_date TEXT NOT NULL,
    event_start_time TEXT NOT NULL,
    event_end_time TEXT NOT NULL,
    workload_hours INTEGER NOT NULL DEFAULT 8,
    organizer_entity TEXT NOT NULL,
    location_venue TEXT NOT NULL,
    location_address TEXT NOT NULL,
    location_city TEXT NOT NULL,
    location_state TEXT NOT NULL,
    certificate_validation_url TEXT,
    manager_email TEXT NOT NULL DEFAULT 'amandajhonnes@yahoo.com.br',
    certificate_design JSONB,
    badge_design JSONB,
    emailjs_config JSONB,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Materiais para Download
CREATE TABLE IF NOT EXISTS public.download_materials (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    author TEXT NOT NULL,
    format TEXT NOT NULL DEFAULT 'PDF', -- 'PDF' | 'DOCX' | 'ZIP'
    size TEXT NOT NULL,
    description TEXT NOT NULL,
    pages INTEGER NOT NULL DEFAULT 1,
    downloads_count INTEGER NOT NULL DEFAULT 0,
    file_url TEXT,
    file_name TEXT,
    mime_type TEXT DEFAULT 'application/pdf',
    chunk_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_materials_category ON public.download_materials(category);
CREATE INDEX IF NOT EXISTS idx_materials_format ON public.download_materials(format);

-- 4. Tabela de Publicações do Mural Social
CREATE TABLE IF NOT EXISTS public.social_posts (
    id TEXT PRIMARY KEY,
    author_name TEXT NOT NULL,
    author_role TEXT NOT NULL,
    city TEXT NOT NULL,
    content TEXT NOT NULL,
    photo_url TEXT,
    likes INTEGER NOT NULL DEFAULT 0,
    is_moderated BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_social_posts_created ON public.social_posts(created_at DESC);

-- 5. Tabela de Assinantes da Newsletter / Boletim
CREATE TABLE IF NOT EXISTS public.subscribers (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    phone TEXT,
    role TEXT,
    origin TEXT DEFAULT 'portal',
    subscribed_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tabela de Histórico de Certificados Baixados
CREATE TABLE IF NOT EXISTS public.certificate_downloads (
    id TEXT PRIMARY KEY,
    registration_id TEXT NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    full_name TEXT NOT NULL,
    cpf TEXT NOT NULL,
    downloaded_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cert_downloads_code ON public.certificate_downloads(code);

-- ==============================================================================
-- Políticas de Segurança (Row Level Security - RLS)
-- ==============================================================================

ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_downloads ENABLE ROW LEVEL SECURITY;

-- Leitura pública para materiais, posts moderados e configurações
CREATE POLICY "Materiais visíveis para todos" ON public.download_materials FOR SELECT USING (true);
CREATE POLICY "Configurações visíveis para todos" ON public.event_config FOR SELECT USING (true);
CREATE POLICY "Mural visível para todos" ON public.social_posts FOR SELECT USING (is_moderated = true);

-- Inserção pública permitida para inscrições, newsletter e postagens
CREATE POLICY "Qualquer visitante pode se inscrever" ON public.registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Qualquer visitante pode assinar newsletter" ON public.subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "Qualquer visitante pode postar no mural" ON public.social_posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Histórico de downloads de certificado" ON public.certificate_downloads FOR INSERT WITH CHECK (true);

-- Atualização e leitura administrativa total para gestores autenticados
CREATE POLICY "Acesso irrestrito a usuários autenticados" ON public.registrations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Gestão de configurações para autenticados" ON public.event_config FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Gestão de materiais para autenticados" ON public.download_materials FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Gestão de posts para autenticados" ON public.social_posts FOR ALL TO authenticated USING (true) WITH CHECK (true);
