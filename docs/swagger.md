# Laboratorio Swagger de MyT

El backend usa Spring Boot **4.1.1**, Java **21** y Maven Wrapper.
Se incorporó `org.springdoc:springdoc-openapi-starter-webmvc-ui:3.1.1`.
La [guía oficial de compatibilidad](https://springdoc.org/faq.html) indica
springdoc 3.x para Spring Boot 4.

## Implementación

`OpenApiConfig` define el título y las instrucciones de autenticación de la API.
Swagger muestra las rutas `/api/**`; las vistas MVC no forman parte de este contrato.
`UsuarioRestController` documenta listado, consulta por ID y registro mediante
`@Tag`, `@Operation`, `@Parameter` y `@ApiResponse`. `SesionRestController`
explica el inicio de sesión y la selección de perfil.

Las rutas de documentación son públicas. La API conserva sus permisos:
los usuarios requieren una sesión con perfil `ADMINISTRADOR` y las operaciones
que modifican datos requieren `X-MYT-Request: 1`. Swagger presenta ese encabezado
con su valor predeterminado. La cookie HttpOnly se conserva automáticamente
en el navegador; no hay que copiar tokens ni introducir cookies en Swagger.

## Ejecutar con Docker

Desde la raíz del proyecto, con Docker Desktop iniciado y `.env.local` configurado
para la base de desarrollo:

```powershell
docker compose build backend
docker compose up -d
docker compose ps
```

El Dockerfile existente compila el JAR y lo copia dentro de la imagen como
`/app/app.jar`. Por ello no se necesita copiar `backend/app.jar` manualmente.
Se conservan los dos servicios del laboratorio: `backend` y `frontend`.

| Recurso | URL |
| --- | --- |
| Swagger UI | http://localhost:8080/swagger-ui/index.html |
| OpenAPI JSON | http://localhost:8080/v3/api-docs |
| OpenAPI YAML | http://localhost:8080/v3/api-docs.yaml |
| Angular | http://localhost:4200 |

## Repetir las pruebas en Swagger

1. Abre `POST /api/sesion/login` y pulsa **Try it out**.
2. Conserva `X-MYT-Request` en `1`. Introduce las credenciales de una cuenta
   de prueba existente y pulsa **Execute**. El resultado esperado es `200`.
   El conjunto de prueba del repositorio incluye `admin.ortiz@myt.edu.co`;
   su clave de demostración está indicada en `backend/supabase/seeds/dev_seed.sql`.
3. Si la respuesta tiene varios elementos en `opciones`, ejecuta
   `POST /api/sesion/perfil` con `{"perfil":"ADMINISTRADOR:ID_REAL"}`,
   usando exactamente un valor devuelto por el inicio de sesión.
4. Ejecuta `GET /api/usuarios`: debe responder `200` con una lista de DTO,
   sin contraseñas. Ejecuta también `GET /api/usuarios/{id}` con un ID de esa lista.
5. Consulta `GET /api/usuarios/2147483647`: si ese ID no existe,
   debe responder `404` sin cuerpo. Compara con la respuesta documentada.
6. Ejecuta `POST /api/sesion/logout`. Un nuevo `GET /api/usuarios` debe devolver
   `401`. Una sesión de estudiante o tutor debe obtener `403` al consultar usuarios.

Se utiliza el POST de inicio de sesión y consultas GET para realizar el taller
sin registrar ni modificar usuarios en la base de desarrollo. El JSON del POST
utilizado corresponde a la cuenta y la clave de demostración del seed:

```json
{
  "correo": "admin.ortiz@myt.edu.co",
  "contrasena": "1ManzanaGrande!"
}
```

## Validación y evidencias

La compilación local y la construcción Docker deben completar correctamente.
Para ejecutar las pruebas de integración de API con PostgreSQL temporal aislado:

```powershell
cd backend
.\mvnw.cmd --batch-mode --no-transfer-progress "-Dtest=ApiIntegrationTest" test
```

Estas pruebas verifican también Swagger UI, JSON, YAML, resumen del GET,
respuesta documentada `404`, encabezado CSRF de login, exclusión de vistas MVC
y conservación del `401` para usuarios anónimos. Testcontainers crea y elimina
su base temporal durante las pruebas; no agrega servicios a Compose.

Las evidencias de la ejecución del 26 de octubre de 2026 se guardan en
`docs/evidencias/swagger/`. Los archivos OpenAPI permiten revisar las claves
`openapi`, `paths` y `components`. Las capturas muestran las operaciones y
las respuestas ejecutadas desde Swagger UI.

| Comprobación realizada | Resultado |
| --- | --- |
| Compilación local del JAR y Checkstyle | Correcta, sin infracciones |
| Pruebas `ApiIntegrationTest` tras los cambios finales | 6 pruebas, 0 fallos, 0 errores |
| `POST /api/sesion/login` desde Swagger local | 200, perfil ADMINISTRADOR |
| `GET /api/usuarios/3` desde Swagger local y Docker | 200, usuario de prueba |
| `GET /api/usuarios/2147483647` desde Swagger Docker | 404, sin cuerpo |
| OpenAPI JSON y YAML desde Docker | 200 en ambas rutas, OpenAPI 3.1.0 |
| Angular en puerto 4200 | 200 |
| Servicios de Compose | Backend y frontend en ejecución |

Evidencias guardadas:

- [Operaciones documentadas](evidencias/swagger/01-operaciones.png).
- [GET ejecutado con respuesta 200](evidencias/swagger/02-get-200.png).
- [Consulta inexistente con respuesta 404](evidencias/swagger/03-get-404.png).
- [Dos servicios en Docker Desktop](evidencias/swagger/04-docker-desktop.png).
- [Salida real de docker compose ps](evidencias/swagger/docker-compose-ps.txt).
- [Definición JSON](evidencias/swagger/openapi.json) y
  [definición YAML](evidencias/swagger/openapi.yaml).
- [Resultado de las pruebas](evidencias/swagger/pruebas.txt).

Se conserva la salida de `docker compose ps` como texto y una captura de Docker
Desktop con los dos servicios activos. Si la entrega exige específicamente una
captura de la terminal, ejecuta `docker compose ps` y captura esa ventana.

Durante la verificación, el agente de telemetría existente intentó enviar registros
a un colector OTLP local en el puerto 4318 que no estaba disponible. La aplicación
inició y las consultas del taller funcionaron; ese mensaje corresponde a la
configuración de observabilidad, no a Swagger.
