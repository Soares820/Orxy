-- ============================================================
-- Adiciona colunas nome e tipo_registro à tabela metas
-- Permite armazenar atividades personalizadas do PEI Screen
-- com tipo_registro = 'atividade' (sem paciente vinculado)
-- Execute no Supabase: Dashboard → SQL Editor → New Query
-- ============================================================

ALTER TABLE public.metas
  ADD COLUMN IF NOT EXISTS nome TEXT,
  ADD COLUMN IF NOT EXISTS tipo_registro TEXT NOT NULL DEFAULT 'meta';

CREATE INDEX IF NOT EXISTS idx_metas_tipo ON public.metas(tipo_registro);
