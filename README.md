# RS Stundenerfassung

Web app para el registro de horas de los trabajadores de RS Asbestsanierung,
con panel de administración para la jefa. Next.js + SQLite, sin
dependencias externas de infraestructura. Ver `spec-horas-trabajadores.md`
para la especificación completa.

## Desarrollo local

1. Copia `.env.example` a `.env.local` y genera un `SESSION_SECRET`:

   ```bash
   cp .env.example .env.local
   openssl rand -base64 32   # pega el resultado como SESSION_SECRET
   ```

2. Instala dependencias y arranca el servidor de desarrollo. La base de
   datos SQLite (`data/app.db`) se crea automáticamente (tablas, feriados
   precargados) la primera vez que algo la usa:

   ```bash
   npm install
   npm run dev
   ```

3. Crea la primera cuenta de jefa (admin):

   ```bash
   node --env-file=.env.local scripts/create-admin.mjs cr@rs-asbestsanierung.ch "Cintia Reitmann" "un-password-seguro"
   ```

   Vuelve a ejecutar el mismo comando (con nueva contraseña) si alguna vez
   necesitas resetear la contraseña de esa cuenta.

## Estructura

- `src/app/login` — login único para ambos roles.
- `src/app/dashboard` — vista del trabajador (registrar horas + historial).
- `src/app/admin` — panel de la jefa (tabla, filtros, edición, export).
- `src/app/admin/trabajadores` — alta/baja de cuentas de trabajadores.
- `src/app/api/export` — genera el Excel (.xlsx) del Stundenrapport.
- `src/lib/db.js` — esquema SQLite, inicialización, automatización de
  feriados.
- `src/lib/auth.js` — hash de contraseña (bcrypt) y cookie de sesión
  firmada (sin servicio de auth externo).
- `src/lib/backup.js` + `src/instrumentation.js` — backup semanal por
  correo (sección 10.1 de la especificación); no hace nada si no hay SMTP
  configurado.
- `scripts/create-admin.mjs` — crea o resetea la cuenta de admin.
- `messages/{de,es}.json` — textos de la interfaz (next-intl, sin prefijo
  de idioma en la URL; el idioma se guarda en una cookie).

## Despliegue (Dokploy)

El `Dockerfile` produce una imagen basada en el modo `standalone` de
Next.js, con `better-sqlite3` compilado dentro del contenedor.

1. Crea la app en Dokploy apuntando a este repositorio.
2. Variables de entorno (runtime, no hacen falta build args):
   - `SESSION_SECRET` — genera uno con `openssl rand -base64 32`.
   - Opcional, para el backup semanal por correo: `SMTP_HOST`,
     `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`,
     `BACKUP_EMAIL_TO`.
3. **Monta un volumen persistente en `/app/data`** — ahí vive el archivo
   SQLite. Sin esto, los datos se pierden en cada redeploy.
4. Despliega. La base de datos se inicializa sola en el primer arranque.
5. Crea la cuenta de admin ejecutando dentro del contenedor ya desplegado:

   ```bash
   docker exec -it <nombre-del-contenedor> node scripts/create-admin.mjs cr@rs-asbestsanierung.ch "Cintia Reitmann" "un-password-seguro"
   ```

   (El nombre exacto del contenedor lo ves en Dokploy o con `docker ps`.)

## Backup

- **Volumen persistente** (`/app/data`): protege los datos ante un
  redeploy o reinicio del contenedor.
- **Backup semanal por correo** (opcional, sección 10.1): si configuras las
  variables `SMTP_*` y `BACKUP_EMAIL_TO`, cada lunes a las 06:00 la app
  genera el Excel completo del año en curso y lo envía por correo a la
  jefa — una copia legible fuera del servidor, por si el servidor
  completo tuviera un problema grave.
