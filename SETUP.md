# Configuración de Matriz Legal

## 1. Crear proyecto en Supabase

1. Ir a https://supabase.com y crear cuenta (es gratis)
2. Crear un nuevo proyecto
3. Anotar la **URL del proyecto** y las **claves de API** (Settings > API)

## 2. Configurar variables de entorno

Copiar el archivo `.env.local.example` y renombrarlo a `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...anon_key...
SUPABASE_SERVICE_ROLE_KEY=eyJ...service_role_key...
```

> La Service Role Key está en Supabase > Settings > API > service_role

## 3. Aplicar el schema de base de datos

1. Abrir **Supabase Studio** del proyecto
2. Ir a **SQL Editor**
3. Copiar y pegar TODO el contenido de `supabase/migrations/001_schema.sql`
4. Ejecutar

## 4. Crear bucket de Storage

1. En Supabase > **Storage**
2. Crear un nuevo bucket llamado exactamente: `documentos`
3. Marcar como **Public bucket** (para que los PDFs sean accesibles)

## 5. Crear usuario inicial

1. En Supabase > **Authentication** > Users
2. Click "Add user" > "Create new user"
3. Ingresar email y contraseña

## 6. Importar datos del Excel (una sola vez)

```bash
pip install openpyxl requests
# Editar scripts/import-excel.py con SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
python scripts/import-excel.py
```

O directamente con variables de entorno:
```bash
SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJ... python scripts/import-excel.py
```

## 7. Iniciar la aplicación

```bash
npm run dev
```

Abrir en el navegador: **http://localhost:3000**

---

## Deploy en Vercel (cuando esté listo)

1. Subir el código a GitHub
2. Importar el repositorio en Vercel
3. Configurar las mismas variables de entorno del `.env.local` en Vercel > Settings > Environment Variables
4. Deploy automático

---

## Estructura del proyecto

```
app/
  (auth)/login/        → Página de login
  (dashboard)/         → App principal (requiere login)
    page.tsx           → Dashboard con tabla de leyes
    leyes/[id]/        → Detalle de ley (artículos + documento)
    leyes/nueva/       → Crear nueva ley
    leyes/[id]/editar/ → Editar ley
    historial/         → Log de cambios
api/
  leyes/               → CRUD de leyes
  articulos/           → CRUD de artículos
  upload/              → Subida de documentos a Supabase Storage
supabase/migrations/
  001_schema.sql       → Schema completo con triggers de auditoría
scripts/
  import-excel.py      → Importación única desde el Excel
```
