-- ============================================================
-- Matriz Legal - Schema completo con auditoría automática
-- Ejecutar en Supabase Studio > SQL Editor
-- ============================================================

-- ---- Función auxiliar para pasar email al trigger de auditoría ----

CREATE OR REPLACE FUNCTION set_app_user_email(email TEXT)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.user_email', email, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION set_app_user_email(TEXT) TO authenticated;

-- ---- Tablas principales ----

CREATE TABLE IF NOT EXISTS laws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item INTEGER,
  codigo TEXT NOT NULL,
  titular TEXT,
  anio_publicacion TEXT,
  descripcion TEXT,
  mecanismo_evaluacion TEXT,
  fecha_ultima_evaluacion TEXT,
  estado_cumplimiento TEXT DEFAULT 'na',
  plan_accion TEXT,
  estado_plan_accion TEXT,
  observaciones TEXT,
  vigencia_nota TEXT,
  periodicidad TEXT,
  vigencia TEXT,
  aplicacion TEXT,
  area TEXT,
  documento_nombre TEXT,
  documento_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  law_id UUID NOT NULL REFERENCES laws(id) ON DELETE CASCADE,
  articulo TEXT,
  ambito_aplicacion TEXT,
  frecuencia_evaluacion TEXT,
  cumple BOOLEAN DEFAULT false,
  parcial BOOLEAN DEFAULT false,
  no_cumple BOOLEAN DEFAULT false,
  na BOOLEAN DEFAULT false,
  registro_evidencia TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabla TEXT NOT NULL,
  registro_id UUID NOT NULL,
  law_id UUID,
  accion TEXT NOT NULL,
  campo TEXT,
  valor_anterior TEXT,
  valor_nuevo TEXT,
  usuario_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  law_id UUID NOT NULL REFERENCES laws(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ---- Índices ----

CREATE INDEX IF NOT EXISTS idx_articles_law_id ON articles(law_id);
CREATE INDEX IF NOT EXISTS idx_documents_law_id ON documents(law_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_registro_id ON audit_log(registro_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

-- ---- updated_at automático ----

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER laws_updated_at
  BEFORE UPDATE ON laws FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER articles_updated_at
  BEFORE UPDATE ON articles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---- Auditoría automática ----

CREATE OR REPLACE FUNCTION log_law_changes()
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
    INSERT INTO audit_log(tabla, registro_id, accion, usuario_email)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', user_email);
    RETURN OLD;
  END IF;

  user_email := COALESCE(NULLIF(NEW.updated_by, ''), current_setting('app.user_email', true));

  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log(tabla, registro_id, accion, usuario_email)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', user_email);
    RETURN NEW;
  END IF;

  FOREACH col IN ARRAY ARRAY[
    'codigo','titular','anio_publicacion','descripcion','mecanismo_evaluacion',
    'fecha_ultima_evaluacion','estado_cumplimiento','plan_accion','estado_plan_accion',
    'observaciones','vigencia_nota','periodicidad','vigencia','aplicacion','area','documento_nombre','documento_url'
  ] LOOP
    EXECUTE format('SELECT ($1).%I::TEXT, ($2).%I::TEXT', col, col)
      INTO old_val, new_val USING OLD, NEW;
    IF old_val IS DISTINCT FROM new_val THEN
      INSERT INTO audit_log(tabla, registro_id, accion, campo, valor_anterior, valor_nuevo, usuario_email)
      VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', col, old_val, new_val, user_email);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
    INSERT INTO audit_log(tabla, registro_id, law_id, accion, usuario_email)
    VALUES ('articles', OLD.id, OLD.law_id, 'DELETE', user_email);
    RETURN OLD;
  END IF;

  user_email := COALESCE(NULLIF(NEW.updated_by, ''), current_setting('app.user_email', true));

  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log(tabla, registro_id, law_id, accion, usuario_email)
    VALUES ('articles', NEW.id, NEW.law_id, 'INSERT', user_email);
    RETURN NEW;
  END IF;

  FOREACH col IN ARRAY ARRAY[
    'articulo','ambito_aplicacion','frecuencia_evaluacion',
    'cumple','parcial','no_cumple','na','registro_evidencia'
  ] LOOP
    EXECUTE format('SELECT ($1).%I::TEXT, ($2).%I::TEXT', col, col)
      INTO old_val, new_val USING OLD, NEW;
    IF old_val IS DISTINCT FROM new_val THEN
      INSERT INTO audit_log(tabla, registro_id, law_id, accion, campo, valor_anterior, valor_nuevo, usuario_email)
      VALUES ('articles', NEW.id, NEW.law_id, 'UPDATE', col, old_val, new_val, user_email);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER audit_laws
  AFTER INSERT OR UPDATE OR DELETE ON laws
  FOR EACH ROW EXECUTE FUNCTION log_law_changes();

CREATE OR REPLACE TRIGGER audit_articles
  AFTER INSERT OR UPDATE OR DELETE ON articles
  FOR EACH ROW EXECUTE FUNCTION log_article_changes();

-- ---- Row Level Security ----

ALTER TABLE laws ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_laws" ON laws FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_write_laws" ON laws FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_read_articles" ON articles FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_write_articles" ON articles FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_read_audit" ON audit_log FOR SELECT TO authenticated USING (true);
