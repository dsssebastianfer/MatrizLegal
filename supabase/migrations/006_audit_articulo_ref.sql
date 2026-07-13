-- ============================================================
-- Matriz Legal - Referencia al número de artículo en audit_log
-- Ejecutar en Supabase Studio > SQL Editor
-- ============================================================

ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS articulo_ref TEXT;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS law_id UUID;
CREATE INDEX IF NOT EXISTS idx_audit_log_law_id ON audit_log(law_id);

CREATE OR REPLACE FUNCTION log_article_changes()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  col TEXT;
  old_val TEXT;
  new_val TEXT;
  user_email TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    user_email := current_setting('app.user_email', true);
    INSERT INTO audit_log(tabla, registro_id, law_id, accion, usuario_email, articulo_ref)
    VALUES ('articles', OLD.id, OLD.law_id, 'DELETE', user_email, OLD.articulo);
    RETURN OLD;
  END IF;

  user_email := COALESCE(NULLIF(NEW.updated_by, ''), current_setting('app.user_email', true));

  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log(tabla, registro_id, law_id, accion, usuario_email, articulo_ref)
    VALUES ('articles', NEW.id, NEW.law_id, 'INSERT', user_email, NEW.articulo);
    RETURN NEW;
  END IF;

  FOREACH col IN ARRAY ARRAY[
    'articulo','ambito_aplicacion','frecuencia_evaluacion',
    'cumple','parcial','no_cumple','na','registro_evidencia'
  ] LOOP
    EXECUTE format('SELECT ($1).%I::TEXT, ($2).%I::TEXT', col, col)
      INTO old_val, new_val USING OLD, NEW;
    IF old_val IS DISTINCT FROM new_val THEN
      INSERT INTO audit_log(tabla, registro_id, law_id, accion, campo, valor_anterior, valor_nuevo, usuario_email, articulo_ref)
      VALUES ('articles', NEW.id, NEW.law_id, 'UPDATE', col, old_val, new_val, user_email, NEW.articulo);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
