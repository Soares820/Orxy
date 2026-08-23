-- ══════════════════════════════════════════════════════════════
-- Software para Terapia ABA — Schema Multi-tenant
-- Execute no Supabase SQL Editor (Dashboard → SQL Editor → New query)
--
-- Este arquivo é a referência CONSOLIDADA do schema — reflete o
-- estado cumulativo de todas as migrations em supabase/migrations/
-- até 2026-08-20. Usado para provisionar um ambiente do zero
-- (ex.: novo projeto Supabase de staging). Em produção, as
-- migrations já aplicadas continuam sendo o histórico real; este
-- arquivo é atualizado manualmente sempre que uma migration nova
-- muda a estrutura, para não divergir do banco real.
-- ══════════════════════════════════════════════════════════════

-- ── 1. CLÍNICAS (raiz do multi-tenancy) ──────────────────────
CREATE TABLE IF NOT EXISTS public.clinics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT NOT NULL,
  cnpj        TEXT,
  email       TEXT,
  telefone    TEXT,
  plano       TEXT NOT NULL DEFAULT 'trial',   -- trial | basico | pro | enterprise
  status      TEXT NOT NULL DEFAULT 'trial',   -- trial | ativo | suspenso | cancelado
  trial_ends  TIMESTAMPTZ DEFAULT NOW() + INTERVAL '14 days',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. USUÁRIOS (vinculados ao auth.users do Supabase) ───────
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id     UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id   UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'terapeuta',
  -- roles: admin | terapeuta | recepcao | financeiro | familia
  cargo       TEXT,
  telefone    TEXT,
  status      TEXT NOT NULL DEFAULT 'ativo',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. PACIENTES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pacientes (
  id                  BIGSERIAL PRIMARY KEY,
  clinic_id           UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  codigo              TEXT,   -- código curto de identificação, gerado no app
  dob                 DATE,
  sex                 CHAR(1),
  responsible         TEXT,
  pai_nome            TEXT,
  mae_nome            TEXT,
  email_responsavel   TEXT,
  diagnosis           TEXT,
  therapist           TEXT,
  notes               TEXT,
  status              TEXT NOT NULL DEFAULT 'ativo',   -- ativo | inativo | alta
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. AVALIAÇÕES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.avaliacoes (
  id          BIGSERIAL PRIMARY KEY,
  clinic_id   UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  child_id    BIGINT NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL,   -- PEDI | PS | SPM | ABLLS | VBMAPP | CARS | Vineland | Personalizado | Outro
  data        DATE NOT NULL,
  scores      JSONB NOT NULL DEFAULT '{}',
  notas       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. CONTRATOS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contratos (
  id                BIGSERIAL PRIMARY KEY,
  clinic_id         UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  child_id          BIGINT NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  tipo              TEXT DEFAULT 'particular',   -- particular | convenio
  convenio          TEXT,
  valor_sessao      NUMERIC(10,2),
  sessoes_semanais  INT DEFAULT 1,
  duracao_min       INT DEFAULT 50,
  dia_vencimento    INT DEFAULT 10,
  status            TEXT NOT NULL DEFAULT 'ativo',   -- ativo | encerrado | pausado
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. PAGAMENTOS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pagamentos (
  id              BIGSERIAL PRIMARY KEY,
  clinic_id       UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  child_id        BIGINT NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  contrato_id     BIGINT REFERENCES public.contratos(id) ON DELETE SET NULL,
  mes             TEXT NOT NULL,   -- formato: YYYY-MM
  valor_previsto  NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_recebido  NUMERIC(10,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pendente',   -- pendente | recebido | parcial | inadimplente
  data_pag        DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 7. FUNCIONÁRIOS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.funcionarios (
  id          BIGSERIAL PRIMARY KEY,
  clinic_id   UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  auth_id     UUID REFERENCES auth.users(id),
  nome        TEXT NOT NULL,
  email       TEXT NOT NULL,
  cargo       TEXT,
  nivel       TEXT NOT NULL DEFAULT 'terapeuta',   -- admin | terapeuta | recepcao | financeiro
  status      TEXT NOT NULL DEFAULT 'ativo',
  telefone    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 8. SESSÕES (agenda) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sessoes (
  id              BIGSERIAL PRIMARY KEY,
  clinic_id       UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  child_id        BIGINT REFERENCES public.pacientes(id) ON DELETE SET NULL,
  funcionario_id  BIGINT REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  data            DATE NOT NULL,
  hora            TEXT NOT NULL,   -- HH:MM
  tipo            TEXT NOT NULL DEFAULT 'TO',
  status          TEXT NOT NULL DEFAULT 'agendado',   -- agendado | realizado | cancelado | falta
  duracao_min     INT DEFAULT 50,
  notas           TEXT,
  paciente_nome   TEXT,   -- desnormalizado para facilitar leitura
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 9. METAS / PEI ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.metas (
  id            BIGSERIAL PRIMARY KEY,
  clinic_id     UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  child_id      BIGINT REFERENCES public.pacientes(id) ON DELETE CASCADE,
  nome          TEXT,
  descricao     TEXT NOT NULL,
  area          TEXT,
  status        TEXT NOT NULL DEFAULT 'ativo',   -- ativo | atingido | pausado
  criterio      TEXT,
  tipo_registro TEXT NOT NULL DEFAULT 'meta',   -- meta | atividade (atividade pode não ter child_id)
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 10. FORNECEDORES ──────────────────────────────────────────
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
  contato     TEXT,
  endereco    TEXT,
  notas       TEXT,
  status      TEXT NOT NULL DEFAULT 'ativo',   -- ativo | inativo
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 11. DESPESAS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.despesas (
  id            BIGSERIAL PRIMARY KEY,
  clinic_id     UUID          NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  descricao     TEXT          NOT NULL,
  categoria     TEXT          NOT NULL DEFAULT 'outros',
  valor         DECIMAL(12,2) NOT NULL DEFAULT 0,
  mes           TEXT          NOT NULL,
  data          DATE,
  status        TEXT          NOT NULL DEFAULT 'pago',   -- pago | pendente
  recorrente    BOOLEAN       NOT NULL DEFAULT FALSE,
  fornecedor_id BIGINT        REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  notas         TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── 12. QUESTIONÁRIOS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.questionarios_respostas (
  id             BIGSERIAL PRIMARY KEY,
  clinic_id      UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  child_id       INTEGER NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  instrumento    TEXT NOT NULL,          -- 'M-CHAT-R', 'CARS', 'SDQ', 'SNAP-IV'...
  respondente    TEXT DEFAULT '',        -- 'mãe', 'pai', 'terapeuta', etc.
  respostas      JSONB NOT NULL DEFAULT '{}',
  score_total    NUMERIC,
  score_detalhe  JSONB DEFAULT '{}',
  nivel_risco    TEXT,
  interpretacao  TEXT,
  observacoes    TEXT DEFAULT '',
  data_avaliacao DATE DEFAULT CURRENT_DATE,
  criado_em      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 13. BLOG (conteúdo público, alimentado via cron) ──────────
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id           BIGSERIAL PRIMARY KEY,
  titulo       TEXT NOT NULL,
  resumo       TEXT NOT NULL,
  conteudo     TEXT,
  fonte        TEXT,
  fonte_url    TEXT UNIQUE,
  categoria    TEXT DEFAULT 'Pesquisa',
  tags         TEXT[] DEFAULT '{}',
  publicado_em TIMESTAMPTZ DEFAULT NOW(),
  criado_em    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 14. AUDIT LOG (imutável por RLS) ──────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  clinic_id   UUID REFERENCES public.clinics(id),
  user_id     UUID REFERENCES public.users(id),
  action      TEXT NOT NULL,        -- INSERT | UPDATE | DELETE | LOGIN | LOGOUT | ...
  table_name  TEXT,
  record_id   TEXT,
  details     JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- ÍNDICES para performance
-- ══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_users_auth_id       ON public.users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_clinic        ON public.users(clinic_id);
CREATE INDEX IF NOT EXISTS idx_pacientes_clinic    ON public.pacientes(clinic_id);
CREATE INDEX IF NOT EXISTS idx_pacientes_codigo    ON public.pacientes(codigo);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_clinic   ON public.avaliacoes(clinic_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_child    ON public.avaliacoes(child_id);
CREATE INDEX IF NOT EXISTS idx_contratos_clinic    ON public.contratos(clinic_id);
CREATE INDEX IF NOT EXISTS idx_contratos_child     ON public.contratos(child_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_clinic   ON public.pagamentos(clinic_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_child    ON public.pagamentos(child_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_mes      ON public.pagamentos(mes);
CREATE INDEX IF NOT EXISTS idx_pagamentos_contrato ON public.pagamentos(contrato_id);
CREATE INDEX IF NOT EXISTS idx_funcionarios_clinic ON public.funcionarios(clinic_id);
CREATE INDEX IF NOT EXISTS idx_funcionarios_auth   ON public.funcionarios(auth_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_clinic      ON public.sessoes(clinic_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_data        ON public.sessoes(data);
CREATE INDEX IF NOT EXISTS idx_sessoes_child       ON public.sessoes(child_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_funcionario ON public.sessoes(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_metas_clinic        ON public.metas(clinic_id);
CREATE INDEX IF NOT EXISTS idx_metas_child         ON public.metas(child_id);
CREATE INDEX IF NOT EXISTS idx_metas_tipo          ON public.metas(tipo_registro);
CREATE INDEX IF NOT EXISTS idx_despesas_clinic     ON public.despesas(clinic_id);
CREATE INDEX IF NOT EXISTS idx_despesas_fornecedor ON public.despesas(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_fornecedores_clinic    ON public.fornecedores(clinic_id);
CREATE INDEX IF NOT EXISTS idx_fornecedores_categoria ON public.fornecedores(categoria);
CREATE INDEX IF NOT EXISTS idx_qr_clinic           ON public.questionarios_respostas(clinic_id);
CREATE INDEX IF NOT EXISTS idx_qr_child            ON public.questionarios_respostas(child_id);
CREATE INDEX IF NOT EXISTS idx_qr_instr            ON public.questionarios_respostas(instrumento);
CREATE INDEX IF NOT EXISTS idx_blog_publicado      ON public.blog_posts(publicado_em DESC);
CREATE INDEX IF NOT EXISTS idx_blog_categoria      ON public.blog_posts(categoria);
CREATE INDEX IF NOT EXISTS idx_audit_clinic        ON public.audit_logs(clinic_id);

-- ══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY — isolamento total por clínica
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.clinics       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pacientes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacoes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagamentos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funcionarios  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessoes                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metas                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.despesas                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionarios_respostas  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs               ENABLE ROW LEVEL SECURITY;

-- Função auxiliar: retorna clinic_id do usuário autenticado
CREATE OR REPLACE FUNCTION public.minha_clinica()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT clinic_id FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$;

-- Função auxiliar: retorna o role do usuário autenticado
CREATE OR REPLACE FUNCTION public.meu_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$;

-- ── clinics ───────────────────────────────────────────────────
CREATE POLICY "iso_clinics" ON public.clinics FOR ALL USING (id = public.minha_clinica());

-- ── users: só admin insere/deleta outros usuários ────────────
CREATE POLICY "usr_select" ON public.users FOR SELECT
  USING (clinic_id = public.minha_clinica());
CREATE POLICY "usr_update_own" ON public.users FOR UPDATE
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid() AND clinic_id = public.minha_clinica());
CREATE POLICY "usr_insert_admin" ON public.users FOR INSERT
  WITH CHECK (clinic_id = public.minha_clinica() AND public.meu_role() = 'admin');
CREATE POLICY "usr_delete_admin" ON public.users FOR DELETE
  USING (clinic_id = public.minha_clinica() AND public.meu_role() = 'admin');

-- ── pacientes: só admin pode deletar ─────────────────────────
CREATE POLICY "pac_select" ON public.pacientes FOR SELECT
  USING (clinic_id = public.minha_clinica());
CREATE POLICY "pac_insert" ON public.pacientes FOR INSERT
  WITH CHECK (clinic_id = public.minha_clinica());
CREATE POLICY "pac_update" ON public.pacientes FOR UPDATE
  USING (clinic_id = public.minha_clinica())
  WITH CHECK (clinic_id = public.minha_clinica());
CREATE POLICY "pac_delete" ON public.pacientes FOR DELETE
  USING (clinic_id = public.minha_clinica() AND public.meu_role() = 'admin');

CREATE POLICY "iso_avaliacoes" ON public.avaliacoes FOR ALL USING (clinic_id = public.minha_clinica());

-- ── contratos: só admin pode deletar ─────────────────────────
CREATE POLICY "cont_select" ON public.contratos FOR SELECT
  USING (clinic_id = public.minha_clinica());
CREATE POLICY "cont_insert" ON public.contratos FOR INSERT
  WITH CHECK (clinic_id = public.minha_clinica());
CREATE POLICY "cont_update" ON public.contratos FOR UPDATE
  USING (clinic_id = public.minha_clinica())
  WITH CHECK (clinic_id = public.minha_clinica());
CREATE POLICY "cont_delete" ON public.contratos FOR DELETE
  USING (clinic_id = public.minha_clinica() AND public.meu_role() = 'admin');

-- ── pagamentos: ninguém deleta (imutabilidade financeira) ─────
CREATE POLICY "pag_select" ON public.pagamentos FOR SELECT
  USING (clinic_id = public.minha_clinica());
CREATE POLICY "pag_insert" ON public.pagamentos FOR INSERT
  WITH CHECK (clinic_id = public.minha_clinica());
CREATE POLICY "pag_update" ON public.pagamentos FOR UPDATE
  USING (clinic_id = public.minha_clinica())
  WITH CHECK (clinic_id = public.minha_clinica());
-- DELETE bloqueado: nenhuma política de DELETE = bloqueado por padrão.

-- ── funcionarios: só admin/recepção insere, só admin deleta ──
CREATE POLICY "func_select" ON public.funcionarios FOR SELECT
  USING (clinic_id = public.minha_clinica());
CREATE POLICY "func_insert" ON public.funcionarios FOR INSERT
  WITH CHECK (clinic_id = public.minha_clinica() AND public.meu_role() IN ('admin', 'recepcao'));
CREATE POLICY "func_update" ON public.funcionarios FOR UPDATE
  USING (clinic_id = public.minha_clinica())
  WITH CHECK (clinic_id = public.minha_clinica());
CREATE POLICY "func_delete" ON public.funcionarios FOR DELETE
  USING (clinic_id = public.minha_clinica() AND public.meu_role() = 'admin');

CREATE POLICY "iso_sessoes"  ON public.sessoes FOR ALL USING (clinic_id = public.minha_clinica());
CREATE POLICY "iso_metas"    ON public.metas   FOR ALL USING (clinic_id = public.minha_clinica());

CREATE POLICY "iso_despesas" ON public.despesas FOR ALL
  USING (clinic_id = public.minha_clinica()) WITH CHECK (clinic_id = public.minha_clinica());

CREATE POLICY "iso_fornecedores" ON public.fornecedores FOR ALL
  USING (clinic_id = public.minha_clinica()) WITH CHECK (clinic_id = public.minha_clinica());

CREATE POLICY "qr_select" ON public.questionarios_respostas FOR SELECT USING (clinic_id = public.minha_clinica());
CREATE POLICY "qr_insert" ON public.questionarios_respostas FOR INSERT WITH CHECK (clinic_id = public.minha_clinica());
CREATE POLICY "qr_update" ON public.questionarios_respostas FOR UPDATE USING (clinic_id = public.minha_clinica());
CREATE POLICY "qr_delete" ON public.questionarios_respostas FOR DELETE USING (clinic_id = public.minha_clinica());

-- blog_posts: leitura pública, escrita só pelo service_role (bypassa RLS)
CREATE POLICY "blog_public_read" ON public.blog_posts FOR SELECT TO anon, authenticated USING (true);

-- Audit log: SELECT e INSERT apenas — UPDATE e DELETE bloqueados por ausência de política
CREATE POLICY "audit_select"  ON public.audit_logs FOR SELECT USING (clinic_id = public.minha_clinica());
CREATE POLICY "audit_insert"  ON public.audit_logs FOR INSERT WITH CHECK (clinic_id = public.minha_clinica());

-- ══════════════════════════════════════════════════════════════
-- TRIGGER: mantém funcionarios sincronizado com users
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.sync_user_to_funcionario()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.auth_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.role = 'familia' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.funcionarios
      WHERE auth_id = NEW.auth_id AND clinic_id = NEW.clinic_id
    ) THEN
      INSERT INTO public.funcionarios
        (clinic_id, auth_id, nome, email, cargo, nivel, status, telefone)
      VALUES
        (NEW.clinic_id, NEW.auth_id, NEW.nome, NEW.email,
         NEW.cargo, NEW.role, NEW.status, NEW.telefone);
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.funcionarios
    SET
      nome     = NEW.nome,
      email    = NEW.email,
      cargo    = NEW.cargo,
      nivel    = NEW.role,
      status   = NEW.status,
      telefone = NEW.telefone
    WHERE auth_id = NEW.auth_id
      AND clinic_id = NEW.clinic_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_user_to_funcionario ON public.users;
CREATE TRIGGER trg_sync_user_to_funcionario
  AFTER INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_to_funcionario();

-- ══════════════════════════════════════════════════════════════
-- TRIGGERS: validação cross-tenant (impede FK apontando p/ outra clínica)
-- Ver supabase/migrations/20260820_integrity_hardening.sql para os
-- comentários completos sobre por que isso é necessário.
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.chk_contratos_clinica()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.pacientes WHERE id = NEW.child_id AND clinic_id = NEW.clinic_id) THEN
    RAISE EXCEPTION 'contratos.child_id (%) não pertence à clinic_id % desta linha', NEW.child_id, NEW.clinic_id;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_chk_contratos_clinica ON public.contratos;
CREATE TRIGGER trg_chk_contratos_clinica
  BEFORE INSERT OR UPDATE OF child_id, clinic_id ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.chk_contratos_clinica();

CREATE OR REPLACE FUNCTION public.chk_pagamentos_clinica()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.pacientes WHERE id = NEW.child_id AND clinic_id = NEW.clinic_id) THEN
    RAISE EXCEPTION 'pagamentos.child_id (%) não pertence à clinic_id % desta linha', NEW.child_id, NEW.clinic_id;
  END IF;
  IF NEW.contrato_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.contratos WHERE id = NEW.contrato_id AND clinic_id = NEW.clinic_id
  ) THEN
    RAISE EXCEPTION 'pagamentos.contrato_id (%) não pertence à clinic_id % desta linha', NEW.contrato_id, NEW.clinic_id;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_chk_pagamentos_clinica ON public.pagamentos;
CREATE TRIGGER trg_chk_pagamentos_clinica
  BEFORE INSERT OR UPDATE OF child_id, contrato_id, clinic_id ON public.pagamentos
  FOR EACH ROW EXECUTE FUNCTION public.chk_pagamentos_clinica();

CREATE OR REPLACE FUNCTION public.chk_sessoes_clinica()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.child_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.pacientes WHERE id = NEW.child_id AND clinic_id = NEW.clinic_id
  ) THEN
    RAISE EXCEPTION 'sessoes.child_id (%) não pertence à clinic_id % desta linha', NEW.child_id, NEW.clinic_id;
  END IF;
  IF NEW.funcionario_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.funcionarios WHERE id = NEW.funcionario_id AND clinic_id = NEW.clinic_id
  ) THEN
    RAISE EXCEPTION 'sessoes.funcionario_id (%) não pertence à clinic_id % desta linha', NEW.funcionario_id, NEW.clinic_id;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_chk_sessoes_clinica ON public.sessoes;
CREATE TRIGGER trg_chk_sessoes_clinica
  BEFORE INSERT OR UPDATE OF child_id, funcionario_id, clinic_id ON public.sessoes
  FOR EACH ROW EXECUTE FUNCTION public.chk_sessoes_clinica();

CREATE OR REPLACE FUNCTION public.chk_avaliacoes_clinica()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.pacientes WHERE id = NEW.child_id AND clinic_id = NEW.clinic_id) THEN
    RAISE EXCEPTION 'avaliacoes.child_id (%) não pertence à clinic_id % desta linha', NEW.child_id, NEW.clinic_id;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_chk_avaliacoes_clinica ON public.avaliacoes;
CREATE TRIGGER trg_chk_avaliacoes_clinica
  BEFORE INSERT OR UPDATE OF child_id, clinic_id ON public.avaliacoes
  FOR EACH ROW EXECUTE FUNCTION public.chk_avaliacoes_clinica();

CREATE OR REPLACE FUNCTION public.chk_metas_clinica()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.child_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.pacientes WHERE id = NEW.child_id AND clinic_id = NEW.clinic_id
  ) THEN
    RAISE EXCEPTION 'metas.child_id (%) não pertence à clinic_id % desta linha', NEW.child_id, NEW.clinic_id;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_chk_metas_clinica ON public.metas;
CREATE TRIGGER trg_chk_metas_clinica
  BEFORE INSERT OR UPDATE OF child_id, clinic_id ON public.metas
  FOR EACH ROW EXECUTE FUNCTION public.chk_metas_clinica();

CREATE OR REPLACE FUNCTION public.chk_questionarios_clinica()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.pacientes WHERE id = NEW.child_id AND clinic_id = NEW.clinic_id) THEN
    RAISE EXCEPTION 'questionarios_respostas.child_id (%) não pertence à clinic_id % desta linha', NEW.child_id, NEW.clinic_id;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_chk_questionarios_clinica ON public.questionarios_respostas;
CREATE TRIGGER trg_chk_questionarios_clinica
  BEFORE INSERT OR UPDATE OF child_id, clinic_id ON public.questionarios_respostas
  FOR EACH ROW EXECUTE FUNCTION public.chk_questionarios_clinica();

CREATE OR REPLACE FUNCTION public.chk_despesas_clinica()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.fornecedor_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.fornecedores WHERE id = NEW.fornecedor_id AND clinic_id = NEW.clinic_id
  ) THEN
    RAISE EXCEPTION 'despesas.fornecedor_id (%) não pertence à clinic_id % desta linha', NEW.fornecedor_id, NEW.clinic_id;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_chk_despesas_clinica ON public.despesas;
CREATE TRIGGER trg_chk_despesas_clinica
  BEFORE INSERT OR UPDATE OF fornecedor_id, clinic_id ON public.despesas
  FOR EACH ROW EXECUTE FUNCTION public.chk_despesas_clinica();

-- ══════════════════════════════════════════════════════════════
-- CHECK CONSTRAINTS — válidas de imediato (banco novo, sem dado
-- legado). Em produção use a versão NOT VALID da migration
-- 20260820_integrity_hardening.sql.
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.despesas   ADD CONSTRAINT despesas_categoria_check CHECK (categoria IN (
  'folha','supervisao','aluguel','material','equipamentos','marketing',
  'formacao','adm','ti','outros'
));
ALTER TABLE public.despesas   ADD CONSTRAINT despesas_valor_nao_negativo CHECK (valor >= 0);
ALTER TABLE public.despesas   ADD CONSTRAINT despesas_status_valido CHECK (status IN ('pago','pendente'));
ALTER TABLE public.pagamentos ADD CONSTRAINT pagamentos_valores_nao_negativos CHECK (valor_previsto >= 0 AND valor_recebido >= 0);
ALTER TABLE public.pagamentos ADD CONSTRAINT pagamentos_status_valido CHECK (status IN ('pendente','recebido','parcial','inadimplente'));
ALTER TABLE public.contratos  ADD CONSTRAINT contratos_valor_sessao_nao_negativo CHECK (valor_sessao IS NULL OR valor_sessao >= 0);
ALTER TABLE public.contratos  ADD CONSTRAINT contratos_status_valido CHECK (status IN ('ativo','encerrado','pausado'));
ALTER TABLE public.sessoes    ADD CONSTRAINT sessoes_status_valido CHECK (status IN ('agendado','realizado','cancelado','falta'));
ALTER TABLE public.pacientes  ADD CONSTRAINT pacientes_status_valido CHECK (status IN ('ativo','inativo','alta'));
ALTER TABLE public.users      ADD CONSTRAINT users_role_valido CHECK (role IN ('admin','terapeuta','recepcao','financeiro','familia'));
ALTER TABLE public.users      ADD CONSTRAINT users_status_valido CHECK (status IN ('ativo','inativo'));
ALTER TABLE public.funcionarios ADD CONSTRAINT funcionarios_nivel_valido CHECK (nivel IN ('admin','terapeuta','recepcao','financeiro'));
ALTER TABLE public.funcionarios ADD CONSTRAINT funcionarios_status_valido CHECK (status IN ('ativo','inativo'));
ALTER TABLE public.metas      ADD CONSTRAINT metas_status_valido CHECK (status IN ('ativo','atingido','pausado'));
ALTER TABLE public.metas      ADD CONSTRAINT metas_tipo_registro_valido CHECK (tipo_registro IN ('meta','atividade'));
ALTER TABLE public.fornecedores ADD CONSTRAINT fornecedores_status_valido CHECK (status IN ('ativo','inativo'));
-- NULL é permitido e não conflita entre si; só codigo não-nulo precisa ser único por clínica.
ALTER TABLE public.pacientes  ADD CONSTRAINT pacientes_codigo_unico_por_clinica UNIQUE (clinic_id, codigo);
-- Nota: clinics.plano NÃO tem CHECK aqui de propósito — ver achado
-- sobre app/api/webhook/route.ts gravar 'profissional' em vez de 'pro'.

-- ══════════════════════════════════════════════════════════════
-- SEED — crie uma clínica demo + usuário admin para testar
-- (Execute APÓS criar o usuário no Supabase Auth)
-- Substitua o email e o UUID do auth_id pelo seu
-- ══════════════════════════════════════════════════════════════

/*
-- 1. Criar clínica
INSERT INTO public.clinics (nome, email, plano, status)
VALUES ('Clínica Demo ABA', 'demo@clinica.com', 'pro', 'ativo')
RETURNING id;  -- copie este UUID para o próximo passo

-- 2. Criar usuário admin (coloque o clinic_id retornado acima)
INSERT INTO public.users (auth_id, clinic_id, nome, email, role, cargo, status)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'seu@email.com'),
  'COLE-O-CLINIC-ID-AQUI',
  'Admin',
  'seu@email.com',
  'admin',
  'Administrador',
  'ativo'
);
*/
