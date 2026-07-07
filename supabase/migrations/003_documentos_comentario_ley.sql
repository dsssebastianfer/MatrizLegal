-- ============================================================
-- Matriz Legal - Comentario general de la sección Documentos (por ley)
-- Reemplaza el comentario por-documento agregado en 002
-- Ejecutar en Supabase Studio > SQL Editor
-- ============================================================

ALTER TABLE documents DROP COLUMN IF EXISTS comentario;
ALTER TABLE laws ADD COLUMN IF NOT EXISTS documentos_comentario TEXT;
