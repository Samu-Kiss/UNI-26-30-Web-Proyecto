# Laboratorio Render y Wompi con MyT

## PostgreSQL en Render

Crea un PostgreSQL nuevo en el panel de Render. Elige la misma región que usarás para el backend y selecciona Free si está disponible.

Desde la raíz del repositorio, aplica las migraciones en orden con la conexión **externa** de esa base. Sustituye los tres valores en mayúsculas por los de **Connect**. PostgreSQL solicitará la contraseña de forma interactiva.

```powershell
$migraciones = (Resolve-Path .\backend\supabase\migrations).Path
docker run --rm -it --mount "type=bind,source=$migraciones,target=/migrations,readonly" postgres:17-alpine sh -c 'conn=$1; shift; for f in /migrations/*.sql; do set -- "$@" -f "$f"; done; exec psql -W -v ON_ERROR_STOP=1 -1 "$conn" "$@"' sh 'host=HOST_EXTERNO port=5432 dbname=NOMBRE_BASE user=USUARIO sslmode=require'
```

En pgAdmin también puedes ejecutar los archivos SQL en orden sobre la base nueva. Las tablas de MyT quedan en el esquema `app`. Registra una cuenta de prueba desde Angular cuando el servicio esté disponible.

## Backend en Render

Crea un **Web Service** de tipo Docker desde el repositorio de MyT. Selecciona la rama que contiene este laboratorio. Usa `backend` como **Root Directory**, `./Dockerfile` como **Dockerfile Path**, `.` como **Docker Build Context** y `/api/salud` como **Health Check Path**.

En **Environment**, configura lo siguiente.

| Variable | Valor |
| --- | --- |
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://HOST_INTERNO:5432/NOMBRE_BASE` |
| `SPRING_DATASOURCE_USERNAME` | Usuario del PostgreSQL nuevo |
| `SPRING_DATASOURCE_PASSWORD` | Contraseña del PostgreSQL nuevo |
| `JWT_SECRET` | Secreto nuevo y aleatorio de al menos 32 bytes |
| `JWT_COOKIE_SECURE` | `true` |
| `FRONTEND_URL` | `http://localhost:4200` |
| `WOMPI_PUBLIC_KEY` | Llave `pub_test_…` |
| `WOMPI_PRIVATE_KEY` | Llave `prv_test_…` |
| `WOMPI_INTEGRITY_KEY` | Secreto `test_integrity_…` |
| `WOMPI_EVENTS_SECRET` | Secreto `test_events_…` |

Puedes desplegar el backend antes de ingresar las llaves Wompi. El pago queda deshabilitado hasta configurar las cuatro. Spring Boot toma el puerto de Render mediante `PORT` y valida el esquema creado por las migraciones.

Cuando el servicio esté **Live**, abre `https://TU-SERVICIO.onrender.com/api/salud`. Debe devolver HTTP 200 y `{"estado":"ok"}` después de consultar PostgreSQL.

## Angular en Docker Desktop

Desde la raíz del repositorio, reemplaza el nombre del host y levanta solo el frontend.

```powershell
$env:RENDER_BACKEND_HOST = 'TU-SERVICIO.onrender.com'
docker compose -p myt-render -f compose.render.yaml up -d --build
docker compose -p myt-render -f compose.render.yaml ps
```

Abre `http://localhost:4200`. Nginx reenvía `/api/` por HTTPS a Render para que el navegador conserve la sesión de MyT en el mismo origen. En DevTools → Network → Fetch/XHR, la **Request URL** muestra `localhost:4200/api/…`. Comprueba el HTTP 200, el encabezado `X-MYT-Upstream` y la respuesta directa de `/api/salud` en Render.

Para capturar también una solicitud directa a Render desde el navegador, ejecuta en la consola del frontend `fetch('https://TU-SERVICIO.onrender.com/api/salud')` y revisa esa entrada en Network.

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
