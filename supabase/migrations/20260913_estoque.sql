-- ============================================================
-- Estoque: controle de materiais da clínica + histórico de
-- movimentações (entrada/saída/ajuste), para inventário e
-- rastreabilidade exigida em contratos com prefeitura/convênio.
-- Execute no Supabase: Dashboard → SQL Editor → New Query
-- ============================================================

CREATE TABLE IF NOT EXISTS public.estoque (
  id             BIGSERIAL PRIMARY KEY,
  clinic_id      UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  nome           TEXT NOT NULL,
  categoria      TEXT NOT NULL DEFAULT 'outros',
  -- categorias: terapeutico | escritorio | higiene_epi | alimentacao | limpeza | outros
  quantidade     NUMERIC(12,2) NOT NULL DEFAULT 0,
  unidade        TEXT NOT NULL DEFAULT 'un',
  estoque_minimo NUMERIC(12,2) NOT NULL DEFAULT 0,
  fornecedor_id  BIGINT REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  validade       DATE,
  notas          TEXT,
  status         TEXT NOT NULL DEFAULT 'ativo',  -- ativo | inativo
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_estoque_clinic      ON public.estoque(clinic_id);
CREATE INDEX IF NOT EXISTS idx_estoque_fornecedor  ON public.estoque(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_estoque_categoria   ON public.estoque(categoria);

ALTER TABLE public.estoque ENABLE ROW LEVEL SECURITY;

CREATE POLICY "iso_estoque" ON public.estoque
  FOR ALL USING (clinic_id = public.minha_clinica())
  WITH CHECK (clinic_id = public.minha_clinica());

DO $$ BEGIN
  ALTER TABLE public.estoque
    ADD CONSTRAINT estoque_quantidade_nao_negativa CHECK (quantidade >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.estoque
    ADD CONSTRAINT estoque_status_valido CHECK (status IN ('ativo','inativo')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Cross-tenant: fornecedor_id precisa pertencer à mesma clínica da linha
CREATE OR REPLACE FUNCTION public.chk_estoque_clinica()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.fornecedor_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.fornecedores WHERE id = NEW.fornecedor_id AND clinic_id = NEW.clinic_id
  ) THEN
    RAISE EXCEPTION 'estoque.fornecedor_id (%) não pertence à clinic_id % desta linha', NEW.fornecedor_id, NEW.clinic_id;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_chk_estoque_clinica ON public.estoque;
CREATE TRIGGER trg_chk_estoque_clinica
  BEFORE INSERT OR UPDATE OF fornecedor_id, clinic_id ON public.estoque
  FOR EACH ROW EXECUTE FUNCTION public.chk_estoque_clinica();


-- ────────────────────────────────────────────────────────────
-- Movimentações: histórico de entrada/saída/ajuste por item
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.estoque_movimentacoes (
  id            BIGSERIAL PRIMARY KEY,
  clinic_id     UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  estoque_id    BIGINT NOT NULL REFERENCES public.estoque(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL,  -- entrada | saida | ajuste
  quantidade    NUMERIC(12,2) NOT NULL,
  motivo        TEXT,
  usuario_nome  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_estoque_mov_clinic  ON public.estoque_movimentacoes(clinic_id);
CREATE INDEX IF NOT EXISTS idx_estoque_mov_item    ON public.estoque_movimentacoes(estoque_id);

ALTER TABLE public.estoque_movimentacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "iso_estoque_movimentacoes" ON public.estoque_movimentacoes
  FOR ALL USING (clinic_id = public.minha_clinica())
  WITH CHECK (clinic_id = public.minha_clinica());

DO $$ BEGIN
  ALTER TABLE public.estoque_movimentacoes
    ADD CONSTRAINT estoque_mov_tipo_valido CHECK (tipo IN ('entrada','saida','ajuste')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.estoque_movimentacoes
    ADD CONSTRAINT estoque_mov_quantidade_positiva CHECK (quantidade > 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Cross-tenant: estoque_id precisa pertencer à mesma clínica da movimentação
CREATE OR REPLACE FUNCTION public.chk_estoque_mov_clinica()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.estoque WHERE id = NEW.estoque_id AND clinic_id = NEW.clinic_id
  ) THEN
    RAISE EXCEPTION 'estoque_movimentacoes.estoque_id (%) não pertence à clinic_id % desta linha', NEW.estoque_id, NEW.clinic_id;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_chk_estoque_mov_clinica ON public.estoque_movimentacoes;
CREATE TRIGGER trg_chk_estoque_mov_clinica
  BEFORE INSERT OR UPDATE OF estoque_id, clinic_id ON public.estoque_movimentacoes
  FOR EACH ROW EXECUTE FUNCTION public.chk_estoque_mov_clinica();

-- Toda movimentação atualiza a quantidade do item automaticamente —
-- evita que o cliente precise calcular/gravar o saldo em dois lugares
-- e mantém o histórico como fonte única da verdade do saldo atual.
CREATE OR REPLACE FUNCTION public.aplica_estoque_movimentacao()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tipo = 'entrada' THEN
    UPDATE public.estoque SET quantidade = quantidade + NEW.quantidade WHERE id = NEW.estoque_id;
  ELSIF NEW.tipo = 'saida' THEN
    UPDATE public.estoque SET quantidade = GREATEST(quantidade - NEW.quantidade, 0) WHERE id = NEW.estoque_id;
  ELSIF NEW.tipo = 'ajuste' THEN
    UPDATE public.estoque SET quantidade = NEW.quantidade WHERE id = NEW.estoque_id;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_aplica_estoque_movimentacao ON public.estoque_movimentacoes;
CREATE TRIGGER trg_aplica_estoque_movimentacao
  AFTER INSERT ON public.estoque_movimentacoes
  FOR EACH ROW EXECUTE FUNCTION public.aplica_estoque_movimentacao();
