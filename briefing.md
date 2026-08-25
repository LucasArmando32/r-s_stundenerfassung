# Especificación técnica: App de registro de horas

## 1. Objetivo

Web app sencilla para que los trabajadores registren sus horas trabajadas, y donde la jefa tenga un panel de administración para ver, corregir y exportar las horas de todo el equipo.

## 2. Stack técnico

- **Next.js** (JavaScript, no TypeScript) — frontend y backend integrados en el mismo proyecto (API routes / Server Actions).
- **Supabase self-hosted** (desplegado vía plantilla de Dokploy) — base de datos Postgres + autenticación (login por email/contraseña) + Row Level Security para permisos.
- **Tailwind CSS** — estilos.
- **Idiomas:** alemán y español (ver sección 8).
- **Despliegue:** Dokploy (Docker), en el mismo servidor donde ya corre el resto de servicios del usuario.

## 3. Roles de usuario

- **Trabajador** — solo ve y gestiona sus propias horas.
- **Jefa (admin)** — ve y gestiona las horas de todos los trabajadores, y gestiona las cuentas de los trabajadores.

## 4. Funcionalidades

### 4.1 Trabajador

- Login con email/contraseña.
- Formulario para registrar un día de trabajo con:
  - Fecha.
  - Hora de inicio (ej. 08:00).
  - Hora de fin (ej. 17:00).
  - Minutos/horas de pausa (ej. 30 min de comida).
  - La app **calcula automáticamente** las horas trabajadas: `(hora fin − hora inicio) − pausa`.
  - Nota opcional.
- Ver su propio historial de horas (lista + totales por semana/mes).
- Editar o eliminar sus propias entradas, con estas reglas de fecha:
  - **No puede** registrar ni editar fechas futuras.
  - **Sí puede** registrar o editar fechas pasadas hasta **5 días atrás** desde hoy. Pasado ese margen, solo la jefa puede corregir esa entrada desde el panel admin.

### 4.2 Jefa (Admin)

- Login (mismo sistema, rol distinto).
- Ver una tabla con las horas de todos los trabajadores, filtrable por trabajador y por rango de fechas.
- Ver totales por trabajador y por periodo.
- Editar o corregir cualquier entrada de horas (de cualquier trabajador), sin límite de fecha.
- **Gestión de trabajadores** desde el panel admin:
  - Crear cuentas nuevas: la jefa introduce nombre y apellido; el sistema genera automáticamente el usuario (`nombre.apellido`, con un número al final si ya existe) y una **contraseña aleatoria**, mostrada una sola vez en pantalla para que la jefa la copie y se la entregue al trabajador (WhatsApp o en papel).
  - Desactivar cuentas (el trabajador ya no puede iniciar sesión, pero su historial de horas se conserva).
- Exportar los datos a Excel (.xlsx), un libro por mes (ver sección 10).

### 4.3 Días feriados

- El sistema mantiene una tabla de feriados oficiales del **cantón de Berna**, precargada por año.
- Para cualquier trabajador activo, un día marcado como feriado **cuenta automáticamente como 8h trabajadas**, sin que nadie tenga que rellenar el formulario ese día.
- Esto se refleja igual en el dashboard del trabajador y en el panel/exportación de la jefa, etiquetado claramente como "Feriado" (no como una entrada manual normal).
- Un trabajador o la jefa pueden sobrescribir esa entrada automática si, por ejemplo, alguien sí trabajó ese día (obra urgente).

## 5. Modelo de datos (tablas en Postgres/Supabase)

**users**
- id
- email
- nombre
- rol (`trabajador` | `admin`)
- activo (booleano, para poder desactivar sin borrar)
- (la contraseña la gestiona Supabase Auth, no se guarda en esta tabla)

**time_entries**
- id
- user_id (referencia a users)
- fecha
- hora_inicio
- hora_fin
- pausa_minutos
- horas_calculadas (resultado automático, guardado para no tener que recalcular siempre)
- nota (opcional)
- creado_en
- editado_por (quién hizo la última edición, útil si la jefa corrige algo)
- es_feriado (booleano — para distinguir una entrada automática de feriado de una entrada normal)

**holidays**
- id
- fecha
- nombre (ej. "1. August" / "Nationalfeiertag")
- cantón (fijo: Bern, por si en el futuro hace falta soportar más de uno)

## 6. Páginas / rutas

- `/login` — acceso único para ambos roles; redirige según el rol tras iniciar sesión.
- `/dashboard` — vista del trabajador: formulario para meter horas + su propio historial.
- `/admin` — panel de la jefa: tabla de todos los trabajadores, filtros, edición, botón de exportar.
- `/admin/trabajadores` — gestión de cuentas: crear y desactivar trabajadores.

## 7. Seguridad

- Row Level Security en Supabase: un trabajador solo puede leer/escribir sus propias filas en `time_entries` (y solo dentro de la ventana de 5 días); la jefa (rol `admin`) puede leer/escribir todas, sin límite de fecha.
- Rutas protegidas: si no has iniciado sesión, se redirige a `/login`. Si un trabajador intenta entrar a `/admin`, se le deniega el acceso.

## 8. Idiomas (i18n)

- La aplicación debe estar disponible en **alemán** y **español**.
- El usuario puede cambiar de idioma desde la interfaz (selector visible en login y en el header).
- Se recomienda usar una librería de internacionalización estándar de Next.js (ej. `next-intl`) para mantener todos los textos centralizados y fáciles de traducir/mantener.
- Nota: definir cuál es el idioma por defecto (se asume alemán, dado que el negocio opera en Suiza — confirmar si debe ser español en su lugar).

## 9. Diseño / Identidad visual

El diseño de la app debe seguir la misma línea visual que la web corporativa **rs-asbestsanierung.ch**, para que se sienta parte de la misma marca:

- **Color principal:** rojo granate/burdeos oscuro (aprox. `#8B1E24` — ajustar al tono exacto del logo), usado en botones de acción, cabeceras de sección y acentos.
- **Fondos:** blanco y gris muy claro alternados entre secciones, look limpio y corporativo.
- **Tipografía:** sans-serif, títulos en negrita y de buen tamaño, texto de cuerpo en gris oscuro/negro sobre fondo blanco.
- **Tono visual:** sobrio, profesional, orientado a construcción/industria — nada de colores llamativos fuera de la paleta roja/blanca/gris, sin ilustraciones "infantiles".
- **Logo:** usar el logo/isotipo "RS" de la empresa en el header de la app (mismo que en la web).
- Botones primarios (ej. "Guardar horas", "Exportar") en rojo sólido con texto blanco, igual que los botones de llamada a la acción de la web ("Jetzt Kontakt aufnehmen").

## 10. Exportación

- Botón "Exportar" en el panel admin, con selector de mes (y año).
- Genera un archivo Excel (.xlsx) con **una hoja por mes** (ej. "Januar 2026", "Februar 2026"), formato clásico de hoja de horas (Stundenrapport):
  - **Filas:** los días del mes (1 al 28/30/31).
  - **Columnas:** un trabajador por columna, con sus horas de ese día.
  - Los días feriados se muestran ya con las 8h correspondientes, distinguibles visualmente (ej. fondo de color o etiqueta "Feriado").
  - Fila de totales al final de cada columna (total de horas del mes por trabajador).
- Si se exporta un rango de varios meses, el archivo incluye una hoja por cada mes dentro de ese rango.

## 11. Despliegue

- La app Next.js corre como contenedor Docker gestionado por Dokploy.
- Supabase self-hosted se despliega con la plantilla oficial de Dokploy, en el mismo servidor.

## 12. Fuera de alcance para la versión 1

- Notificaciones por email o push.
- App móvil nativa.
- Integración con nómina.
- Flujo de aprobación de horas (aprobar/rechazar antes de que cuenten como definitivas).

## 13. Decisiones pendientes (a confirmar antes de programar)

- **Idioma por defecto:** ¿alemán o español al entrar por primera vez? (Se asume alemán por defecto, con selector para cambiar a español.)
- **Color exacto de marca:** confirmar el código de color hexadecimal exacto del rojo corporativo (se puede sacar directamente del archivo del logo).
- **Feriados y trabajadores a tiempo parcial:** las 8h automáticas por feriado asumen jornada completa. Si en el futuro hay algún trabajador a tiempo parcial, ¿las horas de feriado deberían ser proporcionales a su jornada habitual en vez de 8h fijas?

---

*Este documento está pensado para entregarse a Claude Code como punto de partida antes de escribir el código del proyecto
