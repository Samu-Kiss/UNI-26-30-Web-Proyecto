# Entrega 2: Angular, API y PostgreSQL

## Arranque desde un checkout limpio

Requisitos: Java 21 o posterior compatible, Node 24, npm y Docker en ejecución.
La demo usa PostgreSQL 17 local sin credenciales de Supabase.

En PowerShell, desde la raíz:

```powershell
./backend/run-demo.ps1
```

En otra terminal:

```powershell
cd frontend
npm ci
npm start
```

Abre http://localhost:4200. El proxy envía `/api` a localhost:8080.
El script conecta el backend a localhost:55432 y desactiva la importación de `.env.local`.
`compose.demo.yaml` inicializa una base vacía con las cuatro migraciones en orden y el seed.
El volumen `myt-demo_demo_data` conserva los cambios entre reinicios; Hibernate valida el esquema.
La demo no modifica Supabase. Para detener la base: `docker compose -f compose.demo.yaml stop`.
Las migraciones de inicialización solo se ejecutan al crear el volumen por primera vez.

Todas las cuentas de demo usan la clave `1ManzanaGrande!`:

| Perfil | Correo |
| --- | --- |
| Administrador | admin.ortiz@myt.edu.co |
| Estudiante | estudiante01@myt.edu.co |
| Tutor | tutor01@myt.edu.co |

Hay 30 tutores: seis páginas de cinco registros. El seed incluye materias, agendas, reseñas y
reservas. Usa una fecha futura y un horario libre de la agenda; el servidor valida solapamientos.
El administrador puede añadir el perfil tutor a una cuenta estudiante existente. Al volver a
ingresar, esa cuenta elige perfil.

Para Supabase sigue las variables y migraciones del README. En producción sirve la SPA y `/api`
bajo el mismo origen mediante un proxy, usa una clave JWT aleatoria de al menos 32 bytes y
`JWT_COOKIE_SECURE=true` con HTTPS. La clave de demo es exclusivamente local.
La API admite CORS con credenciales únicamente desde http://localhost:4200 en desarrollo.
Las mutaciones requieren `X-MYT-Request: 1`: los formularios externos no pueden enviar esa
cabecera y CORS rechaza su preflight. El interceptor Angular la añade a las llamadas de la API.
La cookie es HttpOnly y SameSite=Strict; el token nunca se guarda en localStorage ni en la URL.

## Requisito → implementación → demostración

Las rutas son relativas al repositorio. En `backend/...` se omite `src/main/java/com/typeerror/myt`.

| Issues | Archivo / símbolo | Demostración |
| --- | --- | --- |
| #55 | `backend/.../repository/TutorRepository.java`: `findCalificacionPromedioByTutorId`, `buscar`; `ReservaRepository.java`: `buscarPorEstudiante` | Calificación real, filtro por materia/tarifa y reservas por estado. Tres `@Query` JPQL explícitas. |
| #56 | `backend/.../api/TutorRestController.java`, `ReservaRestController.java`, `ApiExceptionHandler.java` | Operaciones de la tabla siguiente, respuestas JSON y paginación ordenada por ID. |
| #57 | `frontend/src/app/app.routes.ts`, `app.config.ts`, `app.html` | `/` redirige a `/tutores`; enlaces activos, `router-outlet` y `provideHttpClient`. |
| #58 | Historial de integración y página Usuarios / RxJS | Primera entrega MVC conservada; laboratorio separado del catálogo y protegido como administrador. El stash anterior se conserva: su sesión por URL queda sustituida por JWT. |
| #59 | `ApiDtos.UsuarioDto`, `ApiInterceptor`, `Usuario.contrasena` | Anónimo: 401 JSON; estudiante: 403; administrador: DTO sin contraseña/hash/campos internos. No se aceptan roles en altas. |
| #60 | `SesionRestController`, `JwtSesionService`, `AuthService`, `sessionGuard` | Login incorrecto, selección dual, recarga, logout y permisos del servidor. |
| #61 | `ApiService`, acciones con `subscribe` de `TutoresPageComponent` / `ReservasPageComponent` | Ocho operaciones con persistencia en PostgreSQL. |
| #62 | `TutorEditorComponent`: `input`, `output`, `emit`; padre `[tutor]`, `(guardado)="guardar($event)"` | Descarga por ID, precarga de copia, validación, PUT y cancelación sin guardar. |
| #63 | `TutorEditorComponent.form`: `FormGroup`, `FormControl`, `ReactiveFormsModule` | Biografía requerida/máximo 2000 y tarifa mínima/máxima. Login y altas conservan `ngModel`. |
| #64 | `TutoresPageComponent.filtrar/navegar`, plantillas de tutores/reservas | Primera/última página, siguiente/anterior, filtros reinician página, `@if`, `@for` y `@switch`. |
| #65 | `mensajeHttp`, `finalize`, `switchMap`, señales de carga y cambios | Espera visible; 409 conserva editor; caída de servidor conserva datos y permite reintento; 401/403 propios. |
| #66 | `ApiIntegrationTest`, `PostgreSqlIntegrationTest`, esta guía | Migraciones reales, regresión MVC por rol, persistencia tras `flush/clear` y demo SPA → API → PostgreSQL. |

## Ocho operaciones HTTP

Todas se centralizan en `frontend/src/app/core/services/api.service.ts`, con `inject(HttpClient)`.
Los padres reciben las respuestas con `subscribe`. Las lecturas usan `switchMap` para cancelar
respuestas antiguas y permitir reintento después de un error.

| Acción visible | Servicio | Suscripción / padre | Endpoint |
| --- | --- | --- | --- |
| Filtros / siguiente / anterior | `tutores` | `TutoresPageComponent.ngOnInit` | GET `/api/tutores?page=0&size=5` |
| Editar / abrir reserva | `tutor` | `seleccionar` / `ReservasPageComponent.ngOnInit` | GET `/api/tutores/{id}` |
| Asignar perfil tutor (admin) | `crearTutor` | `TutoresPageComponent.crear` | POST `/api/tutores` |
| Crear reserva (estudiante) | `crearReserva` | `ReservasPageComponent.crear` | POST `/api/reservas` |
| Guardar editor | `editarTutor` | `TutoresPageComponent.guardar` | PUT `/api/tutores/{id}` |
| Confirmar / cambiar a cancelada | `estadoReserva` | `ReservasPageComponent.cambiar` | PUT `/api/reservas/{id}/estado` |
| Desactivar tutor (confirmación) | `desactivarTutor` | `TutoresPageComponent.desactivar` | DELETE `/api/tutores/{id}` |
| Cancelar reserva (confirmación) | `cancelarReserva` | `ReservasPageComponent.cancelar` | DELETE `/api/reservas/{id}` |

Las bajas son lógicas y preservan relaciones e historial. El estudiante solo cancela sus reservas;
el tutor solo gestiona las suyas; el administrador administra todos los registros. El estudiante
de una reserva nueva se obtiene de la cookie validada. La creación comprueba materia y agenda;
la API bloquea la fila del tutor durante el control de solapamiento para serializar sus solicitudes.

## Guion individual

1. Mostrar `cambios=signal(0)`: la plantilla lee `cambios()` y cada éxito ejecuta
   `update(n => n + 1)`. `set` reemplaza resultados y actualiza la pantalla.
2. Explicar `inject`, tipos y `HttpClient` en `ApiService`: retorna un Observable y la suscripción
   inicia la solicitud. El interceptor agrega cabeceras y credenciales sin exponer el JWT.
3. Mostrar las ocho acciones de la tabla. Recargar tras editar para demostrar persistencia.
   Crear como estudiante, confirmar como su tutor y cancelar como estudiante. Crear dos reservas
   en horarios libres para demostrar cancelación mediante PUT con motivo y mediante DELETE.
4. Mostrar el editor hijo: `input` recibe el registro; `effect` precarga un `FormGroup`;
   `output().emit()` devuelve un borrador y el padre guarda `$event`. Cancelar restablece los
   controles. Las validaciones de servidor se mantienen además de las del cliente.
5. Mostrar las tres JPQL: relaciones, parámetros opcionales, `AVG`, filtros y orden. Los filtros
   se ejecutan en PostgreSQL, sin descargar primero la lista completa.
6. DevTools → Network → Slow 3G temporalmente: observar espera y botones deshabilitados.
   Volver a red normal. Activar Offline después de cargar: fallo visible y datos conservados;
   volver Online y reintentar. Repetir un alta de perfil tutor produce un 409 diferente del fallo
   de red. La aplicación no incluye demoras artificiales permanentes.
7. Usuarios / RxJS: `combineLatest` une filtro y listado; `switchMap` descarta selecciones antiguas;
   `exhaustMap` evita recargas simultáneas; `concatMap` / `mergeMap` comparan orden/concurrencia;
   `forkJoin` espera dos consultas y `shareReplay` comparte la lista. El laboratorio se mantiene
   separado de las acciones de tutorías.

## Validación

```powershell
cd backend
./mvnw.cmd clean verify
cd ../frontend
npm run lint
npm run test:ci
npm run build
```

Docker debe estar en ejecución. Testcontainers crea PostgreSQL desechable y aplica las migraciones;
las pruebas no usan Supabase. En Windows usa una ruta local con permisos de escritura. Si aparece
EPERM, cierra procesos que bloqueen `frontend/.angular`, ejecuta `npm ci` y repite `test:ci`.
Un build aprobado no sustituye las pruebas.

Evidencia local del 26 de octubre de 2026: backend `verify`, 122 pruebas, cero fallos y errores,
una omitida por requerir DSN de Sentry; frontend, 45 pruebas aprobadas.
Los resultados definitivos y el recorrido de navegador se registran en el PR de integración.


Comprobación en Microsoft Edge contra la base de demo: login y logout, seis páginas reales,
edición con persistencia después de recargar, alta de tutor y conflicto 409, selección de dos
perfiles, creación/confirmación/cancelación de reservas con PUT y DELETE, desactivación de tutor,
y fallo de red con datos conservados y recuperación. La inicialización desde una base vacía
terminó sin errores y generó 30 tutores. Los cambios de la demo se hicieron solo en PostgreSQL local.
