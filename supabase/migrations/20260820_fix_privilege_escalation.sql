-- ============================================================
-- Fix: escalação de privilégio via update direto (RLS não cobre coluna)
-- Execute no Supabase: Dashboard → SQL Editor → New Query
-- ============================================================
-- Contexto: as políticas RLS existentes (schema.sql / 20260714_rls_policies.sql)
-- isolam por clinic_id mas não restringem QUAIS colunas um usuário pode
-- alterar na própria linha. Como o browser fala direto com o Postgres via
-- anon key + JWT, qualquer usuário autenticado (inclusive role "familia")
-- pode hoje, via supabase-js no devtools:
--   supabase.from('users').update({ role: 'admin' }).eq('auth_id', meuId)
--   supabase.from('clinics').update({ plano: 'enterprise', status: 'ativo' }).eq('id', minhaClinica)
--   supabase.from('clinics').delete().eq('id', minhaClinica)  -- cascade em toda a clínica
-- Isso é bloqueado abaixo com triggers (RLS não faz restrição por coluna)
-- e políticas mais granulares para clinics.
-- ============================================================

-- ── 1. Ninguém pode alterar o próprio role ou clinic_id via update direto ──
-- Mudança de role/clinic_id só deve acontecer via API server-side
-- (service role), nunca pelo próprio usuário editando sua linha.
CREATE OR REPLACE FUNCTION public.prevent_self_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND OLD.auth_id = auth.uid() THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Não é permitido alterar o próprio role diretamente';
    END IF;
    IF NEW.clinic_id IS DISTINCT FROM OLD.clinic_id THEN
      RAISE EXCEPTION 'Não é permitido alterar a própria clínica diretamente';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_role_change ON public.users;
CREATE TRIGGER trg_prevent_self_role_change
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_role_change();

-- ── 2. Plano/status da clínica só mudam via billing (service role) ────────
-- auth.uid() é NULL em conexões com a service_role key (webhook.js), então
-- este trigger não afeta o fluxo real de cobrança — só bloqueia o browser.
CREATE OR REPLACE FUNCTION public.prevent_billing_field_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NEW.plano IS DISTINCT FROM OLD.plano THEN
      RAISE EXCEPTION 'Alteração de plano só pode ser feita via checkout/billing';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Alteração de status só pode ser feita via billing';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_billing_field_change ON public.clinics;
CREATE TRIGGER trg_prevent_billing_field_change
  BEFORE UPDATE ON public.clinics
  FOR EACH ROW EXECUTE FUNCTION public.prevent_billing_field_change();

-- ── 3. clinics: políticas granulares (a antiga "iso_clinics" FOR ALL ──────
--    permitia a QUALQUER membro da clínica, de qualquer role, deletar a
--    própria clínica — o que dispara ON DELETE CASCADE em users, pacientes,
--    sessoes, avaliacoes, contratos, pagamentos, funcionarios, metas,
--    despesas e questionarios_respostas. Restrito a admin abaixo.
--    INSERT não tem política própria: criação de clínica só acontece via
--    /api/provision com service role, que bypassa RLS por design.
DROP POLICY IF EXISTS "iso_clinics" ON public.clinics;

CREATE POLICY "clinics_select" ON public.clinics
  FOR SELECT USING (id = public.minha_clinica());

CREATE POLICY "clinics_update" ON public.clinics
  FOR UPDATE
  USING (id = public.minha_clinica() AND public.meu_role() = 'admin')
  WITH CHECK (id = public.minha_clinica() AND public.meu_role() = 'admin');

CREATE POLICY "clinics_delete" ON public.clinics
  FOR DELETE USING (id = public.minha_clinica() AND public.meu_role() = 'admin');

-- ============================================================
-- Pré-requisito: este arquivo assume que 20260714_rls_policies.sql
-- (que cria public.meu_role()) já foi executado. Se meu_role() não
-- existir, rode aquele arquivo primeiro.
-- ============================================================
