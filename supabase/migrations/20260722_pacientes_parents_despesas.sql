-- Adiciona campos de pais/responsáveis na tabela pacientes
ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS pai_nome TEXT,
  ADD COLUMN IF NOT EXISTS mae_nome TEXT,
  ADD COLUMN IF NOT EXISTS email_responsavel TEXT;

-- Tabela de despesas operacionais (ADM, folha, aluguel, etc.)
CREATE TABLE IF NOT EXISTS despesas (
  id           BIGSERIAL PRIMARY KEY,
  clinic_id    UUID          NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  descricao    TEXT          NOT NULL,
  categoria    TEXT          NOT NULL DEFAULT 'outros',
  valor        DECIMAL(12,2) NOT NULL DEFAULT 0,
  mes          TEXT          NOT NULL,   -- YYYY-MM
  data         DATE,
  status       TEXT          NOT NULL DEFAULT 'pago',
  recorrente   BOOLEAN       NOT NULL DEFAULT FALSE,
  notas        TEXT,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE despesas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "iso_despesas" ON despesas
  USING  (clinic_id = minha_clinica())
  WITH CHECK (clinic_id = minha_clinica());
