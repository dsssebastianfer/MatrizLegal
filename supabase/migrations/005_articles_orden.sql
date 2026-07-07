-- ============================================================
-- Matriz Legal - Orden personalizado de artículos
-- Ejecutar en Supabase Studio > SQL Editor
-- ============================================================

ALTER TABLE articles ADD COLUMN IF NOT EXISTS orden INTEGER;
