-- ============================================================
-- Fornecedores: empresas e prestadores de serviço da clínica
-- Execute no Supabase: Dashboard → SQL Editor → New Query
-- ============================================================

CREATE TABLE IF NOT EXISTS public.fornecedores (
  id          BIGSERIAL PRIMARY KEY,
  clinic_id   UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  cnpj        TEXT,
  cpf         TEXT,
  categoria   TEXT NOT NULL DEFAULT 'outros',
  -- categorias: energia | agua | telefone | internet | aluguel | material |
  --             contabilidade | juridico | manutencao | equipamentos |
  --             software | folha | outros
  email       TEXT,
  telefone    TEXT,
  contato     TEXT,   -- nome do contato/responsável
  endereco    TEXT,
  notas       TEXT,
  status      TEXT NOT NULL DEFAULT 'ativo',  -- ativo | inativo
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fornecedores_clinic    ON public.fornecedores(clinic_id);
CREATE INDEX IF NOT EXISTS idx_fornecedores_categoria ON public.fornecedores(categoria);

ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "iso_fornecedores" ON public.fornecedores
  FOR ALL USING (clinic_id = public.minha_clinica())
  WITH CHECK (clinic_id = public.minha_clinica());

-- Liga fornecedor às despesas
ALTER TABLE public.despesas
  ADD COLUMN IF NOT EXISTS fornecedor_id BIGINT REFERENCES public.fornecedores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_despesas_fornecedor ON public.despesas(fornecedor_id);
