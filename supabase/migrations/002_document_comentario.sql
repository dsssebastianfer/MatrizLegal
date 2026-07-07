-- ============================================================
-- Matriz Legal - Comentario en documentos
-- Ejecutar en Supabase Studio > SQL Editor
-- ============================================================

ALTER TABLE documents ADD COLUMN IF NOT EXISTS comentario TEXT;
