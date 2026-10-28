# Lista de acompañantes (PWA)

Página web instalable donde los hermanos se anotan en un día y horario para
acompañar a los misioneros. Cada semana empieza en blanco sola (lunes a domingo);
los turnos viejos quedan guardados como historial y se pueden ver con las flechas ‹ ›.

**Stack:** HTML + CSS + JS puro (sin build) · Supabase (base de datos) · Vercel (hosting)

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `config.js` | **Lo único que tenés que editar**: claves de Supabase, código de acceso, horarios y días |
| `supabase.sql` | Crea la tabla `turnos` y sus permisos |
| `index.html`, `styles.css`, `app.js` | La app |
| `manifest.webmanifest`, `sw.js`, `icons/` | Lo que la hace instalable y funcional sin conexión |

## Puesta en marcha

### 1. Probar sin configurar nada
Subí la carpeta a Vercel (o abrila con un servidor local). Sin claves de Supabase
funciona en **modo demo**: los datos quedan solo en el teléfono. Sirve para ver el diseño.

> No abras `index.html` con doble clic (`file://`): el service worker y la instalación
> solo andan con `http://localhost` o `https://`. Local: `npx serve .`

### 2. Crear la base en Supabase
1. Creá un proyecto en [supabase.com](https://supabase.com).
2. Entrá a **SQL Editor → New query**, pegá el contenido de `supabase.sql` y tocá **Run**.
3. En **Project Settings → API** copiá la **Project URL** y la clave **anon public**.
4. Pegalas en `config.js` (`SUPABASE_URL` y `SUPABASE_ANON_KEY`).

La clave `anon` es pública por diseño: la protección está en las políticas de la tabla.

### 3. Publicar en Vercel
Subí la carpeta a un repo de GitHub e importalo en Vercel (framework: *Other*, sin build command),
o usá `vercel` desde la terminal dentro de la carpeta.

### 4. Compartir
Mandá el link por el grupo de WhatsApp. En Android aparece "Instalar app";
en iPhone: Safari → Compartir → **Agregar a pantalla de inicio**.

## Cómo funciona

- **Anotarse:** se elige el día arriba y se toca "Anotarme" en el horario. La primera vez pide nombre
  (y WhatsApp, opcional); queda guardado en el teléfono.
- **Varios por horario:** pueden anotarse todos los hermanos que quieran en el mismo horario.
- **Quitarse:** tocar el propio nombre (verde). Cada uno solo puede quitar lo que anotó desde su teléfono.
- **Horarios pasados:** no se pueden anotar ni quitar.
- **Resumen:** pestaña con todos los anotados de la semana y un botón que copia el listado formateado para WhatsApp.
- **Reinicio semanal:** no se borra nada; la app solo muestra la semana actual (la clave es el lunes de cada semana).

## Personalizar

- Horarios y días: `HORAS` y `DIAS` en `config.js`.
- Colores: variables al comienzo de `styles.css`.
- Después de cambiar archivos, subí el número de `VERSION` en `sw.js` para que los teléfonos tomen la versión nueva.

## Límites de seguridad (para tener en cuenta)

- El **código de acceso** se verifica en el navegador: frena a curiosos, pero alguien con conocimientos
  técnicos podría saltearlo. No guardes datos sensibles.
- Las políticas de la tabla permiten leer, crear y borrar a cualquiera que tenga el link y la clave pública.
  El borrado "solo lo tuyo" lo controla la app, no la base. Para una congregación chica es suficiente;
  si necesitás más control, el siguiente paso es agregar login con Supabase Auth.
- El teléfono es opcional y se muestra en la pestaña Resumen a quien tenga acceso a la app.
