-- ============================================================
-- Auditoria da camada de banco de dados — 2026-08-20
-- 100% aditivo e não-destrutivo: cria índices, corrige um
-- trigger e adiciona validações (CHECK ... NOT VALID e triggers
-- BEFORE INSERT/UPDATE). NENHUM dado existente é lido, alterado
-- ou apagado por este arquivo.
--
-- Execute no Supabase: Dashboard → SQL Editor → New Query
-- Pode ser rodado mais de uma vez com segurança (idempotente).
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- PARTE A — índices faltando em colunas de FK
-- ────────────────────────────────────────────────────────────
-- Essas colunas são usadas em joins/lookups e em cascades de
-- ON DELETE, mas não tinham índice. Sem elas, deletar um
-- paciente/funcionário força um sequential scan em cada tabela
-- filha para localizar as linhas a apagar/atualizar.

CREATE INDEX IF NOT EXISTS idx_contratos_child      ON public.contratos(child_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_child         ON public.sessoes(child_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_funcionario   ON public.sessoes(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_child      ON public.pagamentos(child_id);
CREATE INDEX IF NOT EXISTS idx_funcionarios_auth     ON public.funcionarios(auth_id);


-- ────────────────────────────────────────────────────────────
-- PARTE B — corrige bug no trigger sync_user_to_funcionario
-- ────────────────────────────────────────────────────────────
-- Bug original (20260816_sync_users_funcionarios.sql): quando
-- users.auth_id é NULL (ex.: convite pendente ainda sem login),
-- a checagem "NOT EXISTS (... WHERE auth_id = NEW.auth_id ...)"
-- é sempre verdadeira, porque NULL = NULL nunca é TRUE em SQL.
-- Resultado: toda vez que uma linha em users fosse inserida com
-- auth_id NULL, uma nova linha em funcionarios seria criada,
-- gerando duplicatas. Hoje nenhum fluxo do app insere users com
-- auth_id NULL, mas o trigger fica protegido para o futuro.

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


-- ────────────────────────────────────────────────────────────
-- PARTE C — validação cross-tenant em FKs "soltas"
-- ────────────────────────────────────────────────────────────
-- Nenhuma FK do schema garante que o registro referenciado
-- pertence à MESMA clínica da linha que está sendo gravada.
-- Ex.: nada impede, hoje, um INSERT em pagamentos com
-- clinic_id = <clínica A> e child_id apontando para um paciente
-- da clínica B (os ids são BIGSERIAL sequenciais, fáceis de
-- adivinhar). O RLS impede que a clínica A LEIA dados da
-- clínica B, mas não impede essa referência cruzada na escrita —
-- o resultado é uma linha "órfã" que desaparece de joins e
-- quebra relatórios (ex.: BI, MRR) de forma silenciosa.
--
-- As funções abaixo rodam SEM SECURITY DEFINER de propósito:
-- para usuários autenticados normais, o RLS já delimita a
-- consulta interna à própria clínica (reforçando a regra);
-- para o service_role (usado pelas rotas server-side e
-- importações em massa) o RLS é ignorado e a checagem cross-
-- tenant vale de verdade, que é justamente o caso de maior risco.
--
-- Importante: isso só valida ESCRITAS NOVAS (INSERT/UPDATE) a
-- partir de agora. Nenhuma linha existente é lida ou tocada.

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


-- ────────────────────────────────────────────────────────────
-- PARTE D — CHECK constraints com NOT VALID
-- ────────────────────────────────────────────────────────────
-- NOT VALID = a constraint passa a valer para toda escrita NOVA
-- a partir de agora, mas o Postgres NÃO varre as linhas
-- existentes para validá-las (por isso é seguro rodar mesmo sem
-- saber se há dado antigo "fora do padrão"). Para validar o
-- histórico depois, rode os SELECTs de diagnóstico no final
-- deste arquivo e, se tudo limpo, um VALIDATE CONSTRAINT por vez.
--
-- Os valores usados abaixo refletem os comentários do schema.sql
-- e o lib/types.ts (fonte de verdade do frontend). Não incluímos
-- clinics.plano aqui: o app/api/webhook/route.ts grava o valor
-- 'profissional' para o plano intermediário, enquanto o restante
-- do sistema usa 'pro' — ver achado separado sobre essa
-- inconsistência. Adicionar a constraint agora quebraria o
-- webhook do Stripe até esse valor ser alinhado.

DO $$ BEGIN
  ALTER TABLE public.despesas
    ADD CONSTRAINT despesas_valor_nao_negativo CHECK (valor >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.pagamentos
    ADD CONSTRAINT pagamentos_valores_nao_negativos
    CHECK (valor_previsto >= 0 AND valor_recebido >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.contratos
    ADD CONSTRAINT contratos_valor_sessao_nao_negativo
    CHECK (valor_sessao IS NULL OR valor_sessao >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.pagamentos
    ADD CONSTRAINT pagamentos_status_valido
    CHECK (status IN ('pendente','recebido','parcial','inadimplente')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.contratos
    ADD CONSTRAINT contratos_status_valido
    CHECK (status IN ('ativo','encerrado','pausado')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.sessoes
    ADD CONSTRAINT sessoes_status_valido
    CHECK (status IN ('agendado','realizado','cancelado','falta')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.despesas
    ADD CONSTRAINT despesas_status_valido
    CHECK (status IN ('pago','pendente')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.pacientes
    ADD CONSTRAINT pacientes_status_valido
    CHECK (status IN ('ativo','inativo','alta')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.users
    ADD CONSTRAINT users_role_valido
    CHECK (role IN ('admin','terapeuta','recepcao','financeiro','familia')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.users
    ADD CONSTRAINT users_status_valido
    CHECK (status IN ('ativo','inativo')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.funcionarios
    ADD CONSTRAINT funcionarios_nivel_valido
    CHECK (nivel IN ('admin','terapeuta','recepcao','financeiro')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.funcionarios
    ADD CONSTRAINT funcionarios_status_valido
    CHECK (status IN ('ativo','inativo')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.metas
    ADD CONSTRAINT metas_status_valido
    CHECK (status IN ('ativo','atingido','pausado')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.metas
    ADD CONSTRAINT metas_tipo_registro_valido
    CHECK (tipo_registro IN ('meta','atividade')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.fornecedores
    ADD CONSTRAINT fornecedores_status_valido
    CHECK (status IN ('ativo','inativo')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ════════════════════════════════════════════════════════════
-- DIAGNÓSTICO (rode manualmente, opcional) — verifica se há
-- dado histórico que violaria as constraints acima antes de
-- rodar VALIDATE CONSTRAINT. Se todas as consultas abaixo
-- devolverem 0 linhas, é seguro validar.
-- ════════════════════════════════════════════════════════════
/*
SELECT 'despesas.valor negativo' chk, count(*) FROM public.despesas WHERE valor < 0
UNION ALL SELECT 'pagamentos.valor negativo', count(*) FROM public.pagamentos WHERE valor_previsto < 0 OR valor_recebido < 0
UNION ALL SELECT 'contratos.valor_sessao negativo', count(*) FROM public.contratos WHERE valor_sessao < 0
UNION ALL SELECT 'pagamentos.status inválido', count(*) FROM public.pagamentos WHERE status NOT IN ('pendente','recebido','parcial','inadimplente')
UNION ALL SELECT 'contratos.status inválido', count(*) FROM public.contratos WHERE status NOT IN ('ativo','encerrado','pausado')
UNION ALL SELECT 'sessoes.status inválido', count(*) FROM public.sessoes WHERE status NOT IN ('agendado','realizado','cancelado','falta')
UNION ALL SELECT 'despesas.status inválido', count(*) FROM public.despesas WHERE status NOT IN ('pago','pendente')
UNION ALL SELECT 'pacientes.status inválido', count(*) FROM public.pacientes WHERE status NOT IN ('ativo','inativo','alta')
UNION ALL SELECT 'users.role inválido', count(*) FROM public.users WHERE role NOT IN ('admin','terapeuta','recepcao','financeiro','familia')
UNION ALL SELECT 'users.status inválido', count(*) FROM public.users WHERE status NOT IN ('ativo','inativo')
UNION ALL SELECT 'funcionarios.nivel inválido', count(*) FROM public.funcionarios WHERE nivel NOT IN ('admin','terapeuta','recepcao','financeiro')
UNION ALL SELECT 'funcionarios.status inválido', count(*) FROM public.funcionarios WHERE status NOT IN ('ativo','inativo')
UNION ALL SELECT 'metas.status inválido', count(*) FROM public.metas WHERE status NOT IN ('ativo','atingido','pausado')
UNION ALL SELECT 'metas.tipo_registro inválido', count(*) FROM public.metas WHERE tipo_registro NOT IN ('meta','atividade')
UNION ALL SELECT 'fornecedores.status inválido', count(*) FROM public.fornecedores WHERE status NOT IN ('ativo','inativo');

-- Depois de confirmar 0 em tudo, valide uma constraint por vez, ex.:
-- ALTER TABLE public.pagamentos VALIDATE CONSTRAINT pagamentos_status_valido;
*/


-- ════════════════════════════════════════════════════════════
-- PARTE E — OPCIONAL, RODAR SEPARADAMENTE APÓS VERIFICAR DADOS
-- ════════════════════════════════════════════════════════════
-- Diferente das CHECK acima, UNIQUE constraints NÃO suportam
-- NOT VALID no Postgres — validam o histórico inteiro na hora.
-- Se já existir duplicata, o comando abaixo falha (sem apagar
-- nem alterar nada) e a duplicata precisa ser resolvida antes.
--
-- 1) Código do paciente deveria ser único dentro da clínica.
--    Hoje é gerado por Math.random() sem checagem de colisão
--    (components/dashboard/screens/PacientesScreen.tsx,
--    função gerarCodigo()) e não há constraint nenhuma no banco.
--
--    Rode primeiro para achar colisões existentes:
--    SELECT clinic_id, codigo, count(*) FROM public.pacientes
--    WHERE codigo IS NOT NULL GROUP BY clinic_id, codigo HAVING count(*) > 1;
--
--    Se vier vazio, é seguro rodar:
--    CREATE UNIQUE INDEX idx_pacientes_clinic_codigo_unico
--      ON public.pacientes(clinic_id, codigo) WHERE codigo IS NOT NULL;
