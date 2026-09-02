-- ============================================================
-- Matriz Legal - Bitácora de comentarios por artículo
-- Ejecutar en Supabase Studio > SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS articulo_bitacora (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  comentario TEXT NOT NULL,
  autor_email TEXT,
  autor_nombre TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_articulo_bitacora_article_id ON articulo_bitacora(article_id);
