-- ============================================================
-- Sync trigger: users ↔ funcionarios
-- Mantém funcionarios atualizado automaticamente quando
-- um registro em users é criado ou atualizado.
-- Execute no Supabase: Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Backfill: inserir em funcionarios quem já existe em users e não está lá
INSERT INTO public.funcionarios (clinic_id, auth_id, nome, email, cargo, nivel, status, telefone)
SELECT
  u.clinic_id,
  u.auth_id,
  u.nome,
  u.email,
  u.cargo,
  u.role,
  u.status,
  u.telefone
FROM public.users u
WHERE u.role != 'familia'
  AND u.auth_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.funcionarios f
    WHERE f.auth_id = u.auth_id
      AND f.clinic_id = u.clinic_id
  );

-- 2. Função trigger
CREATE OR REPLACE FUNCTION public.sync_user_to_funcionario()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Membros da família não são funcionários
  IF NEW.role = 'familia' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Só insere se ainda não existe (idempotente)
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

-- 3. Remover trigger antigo se existir e recriar
DROP TRIGGER IF EXISTS trg_sync_user_to_funcionario ON public.users;

CREATE TRIGGER trg_sync_user_to_funcionario
  AFTER INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_to_funcionario();
