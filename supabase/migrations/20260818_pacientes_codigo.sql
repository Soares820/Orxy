-- ============================================================
-- Adiciona coluna codigo à tabela pacientes
-- Gerado automaticamente pelo PacientesScreen mas ausente no schema
-- Execute no Supabase: Dashboard → SQL Editor → New Query
-- ============================================================

ALTER TABLE public.pacientes
  ADD COLUMN IF NOT EXISTS codigo TEXT;

CREATE INDEX IF NOT EXISTS idx_pacientes_codigo ON public.pacientes(codigo);
