# RS Stundenerfassung

Web app para el registro de horas de los trabajadores de RS Asbestsanierung,
con panel de administración para la jefa. Next.js + Supabase (self-hosted) +
Tailwind. Ver `briefing.md` para la especificación completa.

## Desarrollo local

1. Copia `.env.example` a `.env.local` y rellena las variables con los datos
   de tu instancia de Supabase (Project Settings → API):

   ```bash
   cp .env.example .env.local
   ```

2. Aplica el esquema de base de datos: abre el SQL Editor de Supabase Studio
   y ejecuta el contenido de `supabase/migrations/0001_init.sql`. Crea las
   tablas (`users`, `time_entries`, `holidays`), las políticas de Row Level
   Security y precarga los feriados del cantón de Berna 2025-2027.

   **Importante:** las fechas de los feriados están calculadas y deben
   verificarse contra el calendario oficial del cantón de Berna antes de
   usarse en producción — un error ahí afecta directamente las horas
   pagadas a los trabajadores.

3. Crea la primera cuenta de jefa (admin) manualmente, ya que la
   creación de cuentas desde `/admin/trabajadores` solo la puede usar
   alguien que ya sea admin:

   - Crea el usuario desde Supabase Studio → Authentication → Add user
     (con email + contraseña), confirmando el email.
   - Inserta su fila en `public.users` con `rol = 'admin'`:

     ```sql
     insert into public.users (id, email, nombre, rol, activo)
     values ('<uuid-del-usuario>', '<email>', 'Nombre Apellido', 'admin', true);
     ```

4. Instala dependencias y arranca el servidor de desarrollo:

   ```bash
   npm install
   npm run dev
   ```

## Estructura

- `src/app/login` — login único para ambos roles.
- `src/app/dashboard` — vista del trabajador (registrar horas + historial).
- `src/app/admin` — panel de la jefa (tabla, filtros, edición, export).
- `src/app/admin/trabajadores` — alta/baja de cuentas de trabajadores.
- `src/app/api/export` — genera el Excel (.xlsx) del Stundenrapport.
- `supabase/migrations/0001_init.sql` — esquema, RLS y feriados.
- `messages/{de,es}.json` — textos de la interfaz (next-intl, sin prefijo
  de idioma en la URL; el idioma se guarda en una cookie).

## Despliegue (Dokploy)

El `Dockerfile` produce una imagen basada en el modo `standalone` de
Next.js. En Dokploy:

1. Despliega primero Supabase self-hosted con la plantilla oficial, en el
   mismo servidor.
2. Crea una app Docker apuntando a este repositorio (o a la imagen
   construida a partir del `Dockerfile`).
3. Configura las variables de entorno de producción:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY` (esta última nunca debe exponerse al
   navegador — solo se usa en Server Actions/route handlers).
4. Ejecuta la migración SQL contra la base de datos de producción antes del
   primer despliegue.
