-- ============================================================
-- Matriz Legal - Backfill de articulo_ref en eventos antiguos
-- Solo recupera la referencia para artículos que aún existen.
-- Los eventos de artículos ya eliminados no se pueden recuperar.
-- Ejecutar en Supabase Studio > SQL Editor (después de 006)
-- ============================================================

UPDATE audit_log
SET articulo_ref = articles.articulo
FROM articles
WHERE audit_log.tabla = 'articles'
  AND audit_log.articulo_ref IS NULL
  AND audit_log.registro_id = articles.id;
