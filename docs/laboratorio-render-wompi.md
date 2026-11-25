# Laboratorio Render y Wompi con MyT

## Base de datos en Supabase

El despliegue en Render usa directamente el proyecto de **Supabase** existente del equipo (no requiere crear un PostgreSQL nuevo en Render).

Si el proyecto de Supabase ya tiene las migraciones iniciales pero deseas aplicar manualmente las migraciones incrementales de reservas, órdenes Wompi y tokens de recuperación desde la raíz del repositorio (o desde el **SQL Editor** de Supabase), puedes ejecutar:

```powershell
$migraciones = (Resolve-Path .\backend\supabase\migrations).Path
docker run --rm -it --mount "type=bind,source=$migraciones,target=/migrations,readonly" postgres:17-alpine sh -c 'conn=$1; shift; existe=$(psql -w -v ON_ERROR_STOP=1 -At "$conn" -c "select to_regclass(\x27app.usuarios\x27) is not null" 2>/dev/null || echo f); if [ "$existe" = "t" ]; then set -- -f /migrations/20261029010000_reserva_objetivo.sql -f /migrations/20261109010000_add_wompi_orders.sql -f /migrations/20261117120000_add_password_reset_tokens.sql; else for f in /migrations/*.sql; do set -- "$@" -f "$f"; done; fi; exec psql -W -v ON_ERROR_STOP=1 -1 "$conn" "$@"' sh 'host=aws-0-us-west-2.pooler.supabase.com port=5432 dbname=postgres user=postgres.PROYECTO_REF sslmode=require'
```

Además, al iniciar en Render, el backend verifica y sincroniza automáticamente las tablas y columnas incrementales (`app.ordenes`, `app.tokens_recuperacion` y `app.reservas.objetivo`) sobre el esquema `app` de Supabase antes de la validación de Hibernate.

## Backend en Render (conectado a Supabase)

Crea un **Web Service** de tipo Docker desde el repositorio de MyT. Selecciona la rama que contiene este laboratorio. Usa `backend` como **Root Directory**, `./Dockerfile` como **Dockerfile Path**, `.` como **Docker Build Context** y `/api/salud` como **Health Check Path**.

En **Environment**, configura la conexión al Session Pooler de **Supabase** (puerto `5432`, compatible con IPv4 en Render) y las llaves del servicio:

| Variable | Valor |
| --- | --- |
| `SPRING_PROFILES_ACTIVE` | `dev` (o `prod` si usas el proyecto de producción) |
| `SUPABASE_DEV_DB_URL` | `jdbc:postgresql://aws-0-us-west-2.pooler.supabase.com:5432/postgres?sslmode=require` |
| `SUPABASE_DEV_DB_USERNAME` | `postgres.rrxvxcufuwmjbqiwhgmt` (o `postgres.TU_PROJECT_REF`) |
| `SUPABASE_DEV_DB_PASSWORD` | Contraseña de la base de datos de Supabase |
| `SUPABASE_URL` | `https://rrxvxcufuwmjbqiwhgmt.supabase.co` (opcional; se deriva de `SUPABASE_DEV_DB_USERNAME`) |
| `SUPABASE_ANON_KEY` | `anon public` key del proyecto en Supabase (para validación de Google OAuth) |
| `JWT_SECRET` | Secreto aleatorio de al menos 32 bytes |
| `JWT_COOKIE_SECURE` | `true` |
| `FRONTEND_URL` | `http://localhost:4200, https://TU-PROYECTO.vercel.app` |
| `WOMPI_PUBLIC_KEY` | Llave `pub_test_…` |
| `WOMPI_PRIVATE_KEY` | Llave `prv_test_…` |
| `WOMPI_INTEGRITY_KEY` | Secreto `test_integrity_…` |
| `WOMPI_EVENTS_SECRET` | Secreto `test_events_…` |

> **Nota:** Si tenías variables `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD` o `DATABASE_URL` apuntando al PostgreSQL interno de Render, **elimínalas** en el panel de Render para que Spring Boot tome las variables `SUPABASE_DEV_DB_*` (o `SUPABASE_PROD_DB_*` si usas `SPRING_PROFILES_ACTIVE=prod`).

Puedes desplegar el backend antes de ingresar las llaves Wompi. El pago queda deshabilitado hasta configurar las cuatro. Spring Boot toma el puerto de Render mediante `PORT` y valida el esquema `app` en Supabase.

Cuando el servicio esté **Live**, abre `https://TU-SERVICIO.onrender.com/api/salud`. Debe devolver HTTP 200 y `{"estado":"ok"}` después de consultar Supabase.

## Angular en Docker Desktop

Desde la raíz del repositorio, reemplaza el nombre del host y levanta solo el frontend.

```powershell
$env:RENDER_BACKEND_HOST = 'TU-SERVICIO.onrender.com'
docker compose -p myt-render -f compose.render.yaml up -d --build
docker compose -p myt-render -f compose.render.yaml ps
```

Abre `http://localhost:4200`. Nginx reenvía `/api/` por HTTPS a Render para que el navegador conserve la sesión de MyT en el mismo origen. En DevTools → Network → Fetch/XHR, la **Request URL** muestra `localhost:4200/api/…`. Comprueba el HTTP 200, el encabezado `X-MYT-Upstream` y la respuesta directa de `/api/salud` en Render.

Para capturar también una solicitud directa a Render desde el navegador, ejecuta en la consola del frontend `fetch('https://TU-SERVICIO.onrender.com/api/salud')` y revisa esa entrada en Network.

## Angular en Vercel

También puedes desplegar el frontend en Vercel usando `frontend` como **Root Directory** (`frontend/vercel.json` y `frontend/api/proxy.mjs`):

1. En Vercel, define la variable de entorno `RENDER_BACKEND_HOST` con el host o URL del backend en Render (por ejemplo, `myt-lab-api.onrender.com`).
2. Durante el build en Vercel (`VERCEL=1`), `prepare-runtime-config.mjs` configura `backendUrl: ""` para que Angular consuma `/api/…` en el mismo origen (`https://TU-PROYECTO.vercel.app/api/…`).
3. La función serverless `frontend/api/proxy.mjs` reenvía `/api/*` por HTTPS hacia Render, conserva la cookie `HttpOnly` (`myt_sesion`) en el mismo origen y expone el encabezado `X-MYT-Upstream`.
4. En Render, puedes definir `FRONTEND_URL=https://TU-PROYECTO.vercel.app` para que Wompi redirija automáticamente de vuelta a `/pago/resultado` tras finalizar el pago.

## Pago de prueba

1. En el panel de Wompi Colombia, selecciona **Sandbox** y registra `https://TU-SERVICIO.onrender.com/api/pagos/webhook` como URL de eventos.
2. Inicia sesión en el frontend local y abre **Laboratorio Wompi**. El backend fija el monto en $15.000 COP y guarda la orden pendiente antes de redirigir al Checkout.
3. Haz un pago aprobado y otro rechazado con las tarjetas de la documentación oficial de Sandbox. Con el frontend en localhost, abre el checkout en otra pestaña y vuelve a MyT para ver el estado de la orden. Wompi bloquea el retorno automático a direcciones locales. El backend valida el aviso y consulta la transacción en Wompi antes de actualizarla.
4. Verifica en PostgreSQL que las dos referencias correspondan a los estados esperados.

```sql
select referencia, monto_en_centavos, estado, wompi_transaccion_id
from app.ordenes
order by fecha_creacion desc;
```

Fuentes oficiales de [Render Docker](https://render.com/docs/docker), [Wompi Checkout Colombia](https://docs.wompi.co/en/docs/colombia/widget-checkout-web/), [eventos](https://docs.wompi.co/en/docs/colombia/eventos/) y [tarjetas Sandbox](https://docs.wompi.co/en/docs/colombia/datos-de-prueba-en-sandbox/).
