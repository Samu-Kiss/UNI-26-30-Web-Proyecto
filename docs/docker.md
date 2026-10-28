# Laboratorio Docker de MyT

El proyecto ejecuta el frontend y el backend en dos contenedores independientes,
siguiendo la arquitectura del laboratorio. PostgreSQL permanece fuera de estos
contenedores: por defecto se usa la conexion de Supabase definida en `.env.local`.

| Servicio | Imagen final | Acceso desde el navegador |
| --- | --- | --- |
| `frontend` | Nginx con Angular compilado | http://localhost:4200 |
| `backend` | Java 21 con Spring Boot | http://localhost:8080 |

## Preparacion

Se requiere Docker Desktop iniciado con contenedores Linux y Docker Compose 2.30 o
posterior (por el formato `raw` del archivo de variables del backend).
No es necesario instalar Java, Node ni Maven en el equipo para construir las imagenes.

Desde la raiz del repositorio, si aun no existe `.env.local`:

```powershell
Copy-Item .env.example .env.local
```

Completa `SUPABASE_DEV_DB_URL`, `SUPABASE_DEV_DB_USERNAME`,
`SUPABASE_DEV_DB_PASSWORD` y `JWT_SECRET`. Usa `SPRING_PROFILES_ACTIVE=dev`,
`DB_SCHEMA=app` y `JWT_COOKIE_SECURE=false` para este laboratorio por HTTP.
La base debe tener aplicadas las migraciones de `backend/supabase/migrations/`
en orden cronologico. Consulta el README para preparar Supabase.

## Construccion y ejecucion

```powershell
docker compose config --quiet
docker compose up --build -d
docker compose ps
docker compose logs --tail 50 backend frontend
```

El primer arranque descarga las imagenes base e instala las dependencias.
Espera a que el backend registre `Started MyTApplication` antes de iniciar sesion.
`depends_on` ordena el inicio de los contenedores; no espera a que Spring termine
de conectarse a PostgreSQL.

El Dockerfile del backend conserva la compilacion Maven multietapa existente,
el agente Sentry y la ejecucion como usuario sin privilegios. No es necesario
copiar manualmente un JAR. El frontend compila con Node 24 compatible con Angular 22
y copia solo los archivos resultantes a Nginx. Las imagenes excluyen archivos
`.env`, dependencias locales, caches y resultados anteriores de compilacion.
El frontend tambien elimina los mapas de codigo antes de crear la imagen final.
El Dockerfile normaliza los saltos de linea del wrapper Maven para construir desde
Windows. La version `SENTRY_VERSION` del agente debe coincidir con `sentry.version`
en `backend/pom.xml` para evitar incompatibilidades al atender peticiones HTTP.

## Comunicacion y comprobaciones

Abre http://localhost:4200 e inicia sesion con una cuenta de la base de desarrollo.
En las herramientas del navegador, la pestaña Network debe mostrar llamadas a
`http://localhost:8080/api/sesion` y a los endpoints de la pagina seleccionada.
La cookie HttpOnly se envia con `withCredentials` y las peticiones incluyen
`X-MYT-Request: 1`. El backend ya permite ese origen, cabeceras y metodos mediante CORS.

Nginx sirve los archivos de Angular; las peticiones de la API salen del navegador.
El nombre `backend` solo resuelve dentro de la red Docker y no debe utilizarse
como direccion de API en el navegador. La direccion se incorpora al construir
el frontend mediante el argumento publico `MYT_BACKEND_URL` en `compose.yaml`.
Si se cambia el puerto o dominio, tambien se deben adaptar el origen permitido
por CORS y la configuracion de cookies del backend, y reconstruir el frontend.

Comprueba tambien que recargar http://localhost:4200/tutores entrega Angular
sin un 404. Una consulta anonima a http://localhost:8080/api/sesion debe devolver
401 JSON: ese resultado es esperado porque requiere una sesion autenticada.

Para revisar el preflight CORS en PowerShell:

```powershell
curl.exe -i -X OPTIONS http://localhost:8080/api/sesion/login -H "Origin: http://localhost:4200" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: content-type,x-myt-request"
```

La respuesta debe permitir `http://localhost:4200` y credenciales.

## Administracion

```powershell
docker compose logs -f backend frontend
docker compose stop
docker compose start
docker compose down
```

`down` elimina los dos contenedores y su red. Los datos de Supabase permanecen
en la base externa. El archivo `compose.demo.yaml` conserva su uso independiente
para la demo PostgreSQL descrita en `docs/entrega-2.md`.
