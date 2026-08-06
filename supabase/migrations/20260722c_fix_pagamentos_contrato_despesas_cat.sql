-- ============================================================
-- Fix: adiciona contrato_id à pagamentos (se não existir)
-- e expande categorias de despesas para clínicas TO/ABA/TEA
-- Execute: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Garante contrato_id em pagamentos
ALTER TABLE public.pagamentos
  ADD COLUMN IF NOT EXISTS contrato_id BIGINT REFERENCES public.contratos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pagamentos_contrato ON public.pagamentos(contrato_id);

-- 2. Categorias de despesa para clínica TO/ABA
--    A coluna já é TEXT, sem ENUM — basta expandir os CHECKs se existirem.
--    Se houver CHECK constraint antiga, removemos e recriamos com as novas categorias.
DO $$
BEGIN
  -- Remove constraint de check antigo se existir
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'despesas'
      AND constraint_type = 'CHECK'
      AND constraint_name LIKE '%categoria%'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE public.despesas DROP CONSTRAINT ' || constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'despesas'
        AND constraint_type = 'CHECK'
        AND constraint_name LIKE '%categoria%'
      LIMIT 1
    );
  END IF;
END $$;

-- 3. Recria a constraint com as novas categorias de TO/ABA
ALTER TABLE public.despesas
  ADD CONSTRAINT despesas_categoria_check CHECK (categoria IN (
    'folha',          -- salários e pró-labore
    'supervisao',     -- supervisão clínica ABA/TO
    'aluguel',        -- aluguel e IPTU
    'material',       -- material terapêutico, brinquedos, itens sensoriais
    'equipamentos',   -- equipamentos clínicos, computadores
    'marketing',      -- captação de pacientes, redes sociais
    'formacao',       -- cursos, workshops, congressos
    'adm',            -- contabilidade, jurídico, seguros
    'ti',             -- software, internet, telefone
    'outros'
  ));

-- 4. Atualiza despesas com categoria antiga 'outros' que na prática
--    seriam mais específicas — não faz migração automática de dados,
--    só garante as novas categorias disponíveis.
