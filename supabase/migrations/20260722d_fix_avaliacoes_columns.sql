-- Renomeia colunas de avaliacoes para corresponder ao código TypeScript
-- Execute no Supabase: Dashboard → SQL Editor → New Query

DO $$
BEGIN
  -- type → tipo
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'avaliacoes' AND column_name = 'type'
  ) THEN
    ALTER TABLE public.avaliacoes RENAME COLUMN type TO tipo;
  END IF;

  -- date → data
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'avaliacoes' AND column_name = 'date'
  ) THEN
    ALTER TABLE public.avaliacoes RENAME COLUMN date TO data;
  END IF;

  -- notes → notas
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'avaliacoes' AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.avaliacoes RENAME COLUMN notes TO notas;
  END IF;
END $$;
