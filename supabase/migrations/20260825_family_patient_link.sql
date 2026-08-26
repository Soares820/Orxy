-- ══════════════════════════════════════════════════════════════
-- Vínculo familia → paciente (fecha o vazamento de dados do Portal
-- da Família: hoje um usuário role='familia' recebe TODOS os
-- pacientes/sessões/avaliações/metas da clínica, sem filtro nenhum).
-- Additive-only, idempotente. Não altera linhas existentes.
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS paciente_id BIGINT REFERENCES public.pacientes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_paciente_id ON public.users(paciente_id);

-- Trigger: paciente_id só pode apontar para um paciente da MESMA clínica do
-- usuário (mesmo padrão dos triggers chk_*_clinica em 20260820_integrity_hardening.sql).
CREATE OR REPLACE FUNCTION public.chk_users_paciente_clinica()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.paciente_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.pacientes WHERE id = NEW.paciente_id AND clinic_id = NEW.clinic_id
  ) THEN
    RAISE EXCEPTION 'users.paciente_id (%) não pertence à clinic_id % desta linha', NEW.paciente_id, NEW.clinic_id;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_chk_users_paciente_clinica ON public.users;
CREATE TRIGGER trg_chk_users_paciente_clinica
  BEFORE INSERT OR UPDATE OF paciente_id, clinic_id ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.chk_users_paciente_clinica();
