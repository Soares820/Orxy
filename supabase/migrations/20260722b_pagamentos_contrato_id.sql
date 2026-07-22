-- Liga pagamento ao contrato que o originou
ALTER TABLE pagamentos
  ADD COLUMN IF NOT EXISTS contrato_id BIGINT REFERENCES contratos(id) ON DELETE SET NULL;
