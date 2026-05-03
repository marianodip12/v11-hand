# 🏐 Handball Pro v11 - Setup completo Supabase + Compartir

## ✅ Lo que está incluido

- ✅ Sincronización automática con Supabase (anonymous auth)
- ✅ Botón **"Compartir"** en cada análisis de partido
- ✅ Página pública `/share/:token` (sin login necesario)
- ✅ Soporte offline (sigue funcionando con localStorage)
- ✅ Build pasa, 129 tests pasan

---

## 🚀 PASO 1: Ejecutar el SQL en Supabase

1. Abrí https://supabase.com/dashboard/project/emmqrzqxlkqvsqbihwdt/sql/new
2. Copiá TODO el contenido de **`01_schema.sql`** (en la raíz del ZIP)
3. Pegalo en el editor
4. Click **"Run"** (o Ctrl+Enter)
5. Vas a ver: ✅ **Success**

⚠️ **IMPORTANTE:** Este script BORRA las tablas viejas (`teams`, `players`, `matches`, etc.) y las recrea correctamente. Si tenías datos viejos en Supabase, se van a perder. Tu localStorage NO se toca.

---

## 🔐 PASO 2: Habilitar Sign-In Anónimo

1. Ir a https://supabase.com/dashboard/project/emmqrzqxlkqvsqbihwdt/auth/providers
2. Buscar **"Anonymous Sign-Ins"**
3. Activar el toggle ✅
4. Click **"Save"**

---

## 🌐 PASO 3: Variables de entorno en Vercel

1. Ir a https://vercel.com/dashboard → tu proyecto → **Settings** → **Environment Variables**
2. Agregar:

   | Key | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | `https://emmqrzqxlkqvsqbihwdt.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | `sb_publishable_viHL4H6Hdsc6IZtqebOAxg_N5N__3fA` |

3. Marcar **Production**, **Preview** y **Development**
4. Click **Save**

(El archivo `.env.local` ya está incluido en el ZIP para desarrollo local).

---

## 📤 PASO 4: Subir a GitHub

### Opción A — Reemplazar todo el repo (más limpio):

```bash
cd ruta/a/tu/repo/v11-hand
# Borrar todos los archivos viejos (excepto .git)
find . -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
# Copiar todos los archivos del ZIP a este directorio
# (extraé el ZIP en otra parte y movelos acá)
git add -A
git commit -m "feat: full Supabase integration + match sharing"
git push
```

### Opción B — Reemplazar solo los archivos modificados:

Estos son los archivos que cambiaron o se crearon:

- `src/lib/supabase.ts` (reemplazar)
- `src/lib/sync.ts` (NUEVO)
- `src/lib/share.ts` (NUEVO)
- `src/features/share/share-page.tsx` (NUEVO - crear carpeta)
- `src/app/app.tsx` (reemplazar)
- `src/main.tsx` (reemplazar)
- `src/features/match-analysis/match-analysis-page.tsx` (reemplazar)
- `01_schema.sql` (en raíz, para tu referencia)
- `.env.local` (en raíz, NO se sube a git)
- `.gitignore` ya debería ignorar `.env.local`

---

## ✨ Cómo usar

### Sincronización
Todo funciona automáticamente. Cada vez que crees un equipo, jugador, partido o evento, se guarda en Supabase con un debounce de 1.5 segundos. Podés ver los datos en:

- Tablas en Supabase: https://supabase.com/dashboard/project/emmqrzqxlkqvsqbihwdt/editor

### Compartir un partido
1. Andá a un partido finalizado
2. Click en **🔗 Compartir** (arriba a la derecha)
3. Se abre un modal con el link
4. Copialo o usalo con WhatsApp/Email/etc.
5. Quien reciba el link verá las stats sin necesidad de login.

El link es **permanente** — el botón "Ver link" lo recupera siempre.

---

## 🧪 Verificación rápida

### Local (en tu PC):
```bash
npm install
npm run dev
```
Abrí http://localhost:5173 → consola del navegador → deberías ver:
```
[sync] inicializando...
[sync] user: <uuid>
[sync] activado ✓
```

### En producción (Vercel):
Después del deploy, abrí tu URL → F12 → consola. Deberías ver los mismos logs.

---

## 🆘 Troubleshooting

**"Anonymous sign-ins disabled"** → Volver al paso 2.

**"Missing VITE_SUPABASE_URL"** → Variables no configuradas en Vercel. Volver al paso 3.

**Los partidos no aparecen en Supabase** → Asegurate de haber corrido el SQL del paso 1 (las tablas tienen que existir).

**"relation does not exist"** → Faltó correr el `01_schema.sql`.

---

## 📊 Estructura final de la base de datos

- `profiles` — usuarios (creado automáticamente por trigger)
- `teams` — equipos (con `local_id` para evitar duplicados)
- `players` — jugadores (con `local_id`)
- `matches` — partidos (con `local_id` + `share_token` + `is_public`)
- `events` — eventos detallados (zona, cuadrante, shooter, etc.)

Las **policies RLS** garantizan:
- Cada usuario solo ve SUS datos
- Cualquiera puede leer matches con `is_public=true` y `share_token`

---

¡Listo! 🎉
