-- Fix blog_posts RLS: garante que leitura pública funcione para a anon key
-- Rodado em 2026-07-25 para corrigir blog vazio

-- 1. Garante que a tabela existe com a estrutura correta
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id          BIGSERIAL PRIMARY KEY,
  titulo      TEXT NOT NULL,
  resumo      TEXT NOT NULL,
  conteudo    TEXT,
  fonte       TEXT,
  fonte_url   TEXT UNIQUE,
  categoria   TEXT DEFAULT 'Pesquisa',
  tags        TEXT[] DEFAULT '{}',
  publicado_em TIMESTAMPTZ DEFAULT NOW(),
  criado_em   TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilita RLS
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- 3. Remove policies antigas (idempotente) e recria corretamente
DROP POLICY IF EXISTS "blog_public_read" ON public.blog_posts;
DROP POLICY IF EXISTS "blog_seed_temp" ON public.blog_posts;

-- 4. Leitura pública para TODOS (anon + authenticated)
CREATE POLICY "blog_public_read"
  ON public.blog_posts
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Verificar resultados
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'blog_posts';
