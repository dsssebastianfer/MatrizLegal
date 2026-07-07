-- ============================================================
-- Matriz Legal - Límite de tamaño y tipo de archivo en bucket "documentos"
-- Ejecutar en Supabase Studio > SQL Editor
-- ============================================================

UPDATE storage.buckets
SET file_size_limit = 7340032, -- 7 MB
    allowed_mime_types = ARRAY[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
WHERE id = 'documentos';
