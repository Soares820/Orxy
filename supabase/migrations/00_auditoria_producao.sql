-- ================================================================
-- AUDITORIA PRÉ-PRODUÇÃO — T.O Plataforma
-- Execute no Supabase: Dashboard → SQL Editor → New Query
-- Resultado único com todas as verificações
-- ================================================================

SELECT secao, item, status FROM (

  -- ── 1. TABELAS ────────────────────────────────────────────────
  SELECT '1. Tabelas' AS secao, t.tabela AS item,
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t.tabela
    ) THEN '✅ existe' ELSE '❌ FALTANDO' END AS status
  FROM (VALUES
    ('clinics'),('users'),('pacientes'),('sessoes'),('contratos'),
    ('pagamentos'),('funcionarios'),('metas'),('avaliacoes'),
    ('despesas'),('blog_posts'),('questionarios_respostas')
  ) AS t(tabela)

  UNION ALL

  -- ── 2. COLUNAS ────────────────────────────────────────────────
  SELECT '2. Colunas' AS secao,
    c.tabela || '.' || c.coluna AS item,
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name  = c.tabela
        AND column_name = c.coluna
    ) THEN '✅ existe'
    ELSE '❌ FALTANDO → rode ' || c.migration END AS status
  FROM (VALUES
    ('pacientes',  'pai_nome',          '20260722_pacientes_parents_despesas.sql'),
    ('pacientes',  'mae_nome',          '20260722_pacientes_parents_despesas.sql'),
    ('pacientes',  'email_responsavel', '20260722_pacientes_parents_despesas.sql'),
    ('pagamentos', 'contrato_id',       '20260722b_pagamentos_contrato_id.sql'),
    ('avaliacoes', 'tipo',              '20260722d_fix_avaliacoes_columns.sql'),
    ('avaliacoes', 'data',              '20260722d_fix_avaliacoes_columns.sql'),
    ('avaliacoes', 'notas',             '20260722d_fix_avaliacoes_columns.sql')
  ) AS c(tabela, coluna, migration)

  UNION ALL

  -- ── 3. RLS ────────────────────────────────────────────────────
  SELECT '3. RLS' AS secao, t.tabela AS item,
    CASE
      WHEN NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = t.tabela
      ) THEN '⚠️  tabela não existe ainda'
      WHEN (
        SELECT relrowsecurity FROM pg_class
        WHERE relname = t.tabela AND relnamespace = 'public'::regnamespace
      ) THEN '✅ RLS ativa'
      ELSE '❌ RLS DESATIVADA'
    END AS status
  FROM (VALUES
    ('clinics'),('users'),('pacientes'),('sessoes'),('contratos'),
    ('pagamentos'),('funcionarios'),('metas'),('avaliacoes'),
    ('despesas'),('questionarios_respostas')
  ) AS t(tabela)

  UNION ALL

  -- ── 4. FUNÇÕES ────────────────────────────────────────────────
  SELECT '4. Funcoes' AS secao, f.funcao AS item,
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = f.funcao
    ) THEN '✅ existe'
    ELSE '❌ FALTANDO → rode schema.sql' END AS status
  FROM (VALUES ('minha_clinica'), ('meu_role')) AS f(funcao)

  UNION ALL

  -- ── 5. POLICIES (contagem por tabela) ─────────────────────────
  SELECT '5. Policies' AS secao,
    t.tabela AS item,
    COALESCE(
      (SELECT qtd::text || ' policies: ' || nomes
       FROM (
         SELECT COUNT(*) AS qtd,
                string_agg(policyname, ', ' ORDER BY policyname) AS nomes
         FROM pg_policies
         WHERE schemaname = 'public' AND tablename = t.tabela
       ) s
       WHERE qtd > 0
      ),
      '❌ SEM POLICIES'
    ) AS status
  FROM (VALUES
    ('clinics'),('users'),('pacientes'),('sessoes'),('contratos'),
    ('pagamentos'),('funcionarios'),('metas'),('avaliacoes'),
    ('despesas'),('blog_posts'),('questionarios_respostas')
  ) AS t(tabela)
  WHERE EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = t.tabela
  )

  UNION ALL

  -- ── 6. ÍNDICES ────────────────────────────────────────────────
  SELECT '6. Indices' AS secao, i.indexname AS item,
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public' AND indexname = i.indexname
    ) THEN '✅ existe' ELSE '❌ FALTANDO' END AS status
  FROM (VALUES
    ('idx_metas_clinic'),('idx_metas_child'),
    ('idx_avaliacoes_clinic'),('idx_avaliacoes_child'),
    ('idx_pagamentos_contrato'),
    ('idx_qr_clinic'),('idx_qr_child'),('idx_qr_instr'),
    ('idx_blog_publicado'),('idx_blog_categoria')
  ) AS i(indexname)

) AS auditoria
ORDER BY secao, status DESC, item;
