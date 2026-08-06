-- Questionários Diagnósticos — respostas e resultados
CREATE TABLE IF NOT EXISTS public.questionarios_respostas (
  id            BIGSERIAL PRIMARY KEY,
  clinic_id     TEXT NOT NULL,
  child_id      INTEGER NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  instrumento   TEXT NOT NULL,         -- 'M-CHAT-R', 'CARS', 'SDQ', 'SNAP-IV'
  respondente   TEXT DEFAULT '',       -- 'mãe', 'pai', 'terapeuta', etc.
  respostas     JSONB NOT NULL DEFAULT '{}',
  score_total   NUMERIC,
  score_detalhe JSONB DEFAULT '{}',    -- subscores por área
  nivel_risco   TEXT,                  -- 'baixo', 'medio', 'alto', 'clinico', etc.
  interpretacao TEXT,
  observacoes   TEXT DEFAULT '',
  data_avaliacao DATE DEFAULT CURRENT_DATE,
  criado_em     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qr_clinic  ON public.questionarios_respostas(clinic_id);
CREATE INDEX IF NOT EXISTS idx_qr_child   ON public.questionarios_respostas(child_id);
CREATE INDEX IF NOT EXISTS idx_qr_instr   ON public.questionarios_respostas(instrumento);

ALTER TABLE public.questionarios_respostas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qr_select" ON public.questionarios_respostas FOR SELECT
  USING (clinic_id = public.minha_clinica());
CREATE POLICY "qr_insert" ON public.questionarios_respostas FOR INSERT
  WITH CHECK (clinic_id = public.minha_clinica());
CREATE POLICY "qr_update" ON public.questionarios_respostas FOR UPDATE
  USING (clinic_id = public.minha_clinica());
CREATE POLICY "qr_delete" ON public.questionarios_respostas FOR DELETE
  USING (clinic_id = public.minha_clinica());
