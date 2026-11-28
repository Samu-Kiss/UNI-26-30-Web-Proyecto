# Auditoría integral de MyT
Fecha: 28 de octubre de 2026. Base: commit d845c11 y cambios locales presentes al inicio.

## Dictamen
La compilación y las pruebas existentes están en verde, pero el producto no está listo para uso real sin corregir la mezcla de datos persistidos con demostraciones en memoria y las inconsistencias entre API y MVC. No se identificó un P0 confirmado. Se priorizan 3 hallazgos P1, 10 P2 y 1 P3. Las prioridades expresan impacto sobre este proyecto, no la severidad CVSS de una dependencia.

## Alcance y evidencia
Se revisaron frontend Angular, API y controladores Thymeleaf, autenticación, reglas de reservas, entidades/repositorios, migraciones, Docker, CI, configuración y documentación. Se ejecutaron las pruebas existentes y compilaciones. Los escenarios descritos debajo son casos de reproducción derivados del código; no se ejecutó una prueba de explotación ni una carrera concurrente controlada.

| Comprobación | Resultado |
| --- | --- |
| Frontend: npm run lint | Correcto |
| Frontend: npm run test:ci | 84/84 pruebas; 16 archivos |
| Frontend: npm run build | Correcto; carga inicial 487,48 kB, transferencia estimada 132,26 kB |
| Cobertura frontend | Líneas 94,35%; ramas 77,98%; funciones 65,49% |
| Backend: Maven verify | BUILD SUCCESS; Checkstyle sin infracciones |
| Pruebas backend | 123 declaradas: 122 aprobadas, 1 omitida, 0 fallos y errores |
| PostgreSQL | Integración ejecutada mediante Testcontainers y cuatro migraciones |
| Cobertura backend del reporte generado | 1072/1126 líneas (95,20%); 351/461 ramas (76,14%) |
| npm audit | 12 paquetes señalados: 7 high, 4 moderate, 1 low; 0 critical |

Entorno: Node 24.21.0, npm 11.19.0 y JDK 26.0.2.1 disponible localmente. El proyecto declara Java 21: esta ejecución no sustituye una ejecución limpia sobre JDK 21. Maven verify reutilizó compilados existentes y JaCoCo puede acumular ejecuciones; la cobertura backend no se presenta como una medición limpia aislada. La prueba omitida es SentryVerificationTest, condicionada por SENTRY_VERIFY.

Se preservaron los cambios locales previos en angular.json y las pruebas. No se modificó implementación, no se publicaron cambios y no se usó la base de producción. No se validaron visualmente navegador/móvil, lector de pantalla, carga sostenida, secretos en todo el historial Git, dependencias Maven contra una base CVE ni infraestructura externa. Por tanto, esto no es una certificación de seguridad o accesibilidad.

## Hallazgos prioritarios

### A01 — P1: El detalle de una reserva real muestra otra y confirma acciones que no se guardan
Evidencia: [frontend/src/app/pages/reserva-detalle-page/reserva-detalle-page.ts:339](<C:/Users/samue/Documents/GitHub Clones/UNI-26-30-Web-Proyecto/frontend/src/app/pages/reserva-detalle-page/reserva-detalle-page.ts:339>); el listado real enlaza a esta pantalla en [frontend/src/app/pages/reservas-page/reservas-page.html:344](<C:/Users/samue/Documents/GitHub Clones/UNI-26-30-Web-Proyecto/frontend/src/app/pages/reservas-page/reservas-page.html:344>).
El detalle busca el ID en cuatro eventos de demostración y, cuando no existe, muestra el primero. Cancelar y proponer horario solo cambian MytStateService, aunque el texto afirma que la operación se realizó. Un usuario puede creer que canceló una reserva que sigue activa en PostgreSQL.
Reproducción propuesta: crear una reserva cuyo ID no pertenezca a los eventos locales, abrir su detalle y cancelar; consultar después la lista real o recargar.
Corrección: consultar la reserva autorizada por ID, responder claramente ante 403/404 y conectar cambios a endpoints persistentes. No usar otro registro como sustituto.
Aceptación: el mismo ID, estado y horario deben coincidir en detalle, lista y base después de recargar; una reserva ajena nunca debe mostrarse.

### A02 — P1: El directorio atribuye datos académicos inventados a usuarios reales
Evidencia: [frontend/src/app/pages/estudiantes-page/estudiantes-page.ts:143](<C:/Users/samue/Documents/GitHub Clones/UNI-26-30-Web-Proyecto/frontend/src/app/pages/estudiantes-page/estudiantes-page.ts:143>).
Al recibir usuarios reales, el componente genera código estudiantil con el ID, universidad y carrera según la posición de la fila, y semestre con módulo aritmético. También confunde ID de usuario con ID de estudiante. No son valores procedentes del perfil académico.
Reproducción propuesta: registrar un estudiante con universidad, programa y semestre conocidos y consultar el directorio.
Corrección: exponer y consumir un DTO de estudiante con sus identificadores y datos auténticos; mostrar campos ausentes como no disponibles.
Aceptación: los campos del directorio coinciden con el registro, independientemente del orden de usuarios.

### A03 — P1: La protección contra reservas simultáneas no cubre el formulario MVC
Evidencia: [backend/src/main/java/com/typeerror/myt/api/ReservaRestController.java:62](<C:/Users/samue/Documents/GitHub Clones/UNI-26-30-Web-Proyecto/backend/src/main/java/com/typeerror/myt/api/ReservaRestController.java:62>), [backend/src/main/java/com/typeerror/myt/controller/TutorController.java:113](<C:/Users/samue/Documents/GitHub Clones/UNI-26-30-Web-Proyecto/backend/src/main/java/com/typeerror/myt/controller/TutorController.java:113>) y [backend/src/main/java/com/typeerror/myt/service/ReservaServiceImpl.java:95](<C:/Users/samue/Documents/GitHub Clones/UNI-26-30-Web-Proyecto/backend/src/main/java/com/typeerror/myt/service/ReservaServiceImpl.java:95>).
La API bloquea al tutor, pero MVC llama directamente al servicio, que lee disponibilidad y guarda sin adquirir ese bloqueo. Dos solicitudes MVC, o una MVC y otra API, pueden observar el intervalo libre e insertar dos reservas. La versión optimista de Reserva protege actualizaciones de la misma fila; no protege dos inserciones distintas. Las migraciones revisadas no contienen una restricción de exclusión de intervalos.
Corrección: adquirir el bloqueo dentro del servicio transaccional común antes de comprobar solapamientos; considerar una exclusión PostgreSQL como defensa adicional.
Aceptación: prueba concurrente con transacciones independientes, incluyendo MVC/API, que permita exactamente una reserva para un intervalo incompatible.
Confianza: riesgo identificado por inspección; la carrera no fue reproducida durante esta auditoría.

## Hallazgos de prioridad media

### A04 — P2: Los días sin disponibilidad se consideran disponibles
Evidencia: [backend/src/main/java/com/typeerror/myt/service/ReservaServiceImpl.java:218](<C:/Users/samue/Documents/GitHub Clones/UNI-26-30-Web-Proyecto/backend/src/main/java/com/typeerror/myt/service/ReservaServiceImpl.java:218>).
La condición intervalos.isEmpty() acepta cualquier horario cuando el tutor no tiene intervalos para ese día. Un tutor con agenda solo los lunes acepta solicitudes directas para el domingo. Esto contradice el formulario MVC, que presenta esos días como no disponibles.
Corrección: definir explícitamente si una agenda completamente vacía permite reservas; un día fuera de una agenda existente debe rechazarse.
Aceptación: probar tutor con agenda parcial, día sin intervalos, intervalo válido y bloqueos.

### A05 — P2: La validación temporal es distinta entre API y MVC y permite horas pasadas
Evidencia: [backend/src/main/java/com/typeerror/myt/api/ApiDtos.java:42](<C:/Users/samue/Documents/GitHub Clones/UNI-26-30-Web-Proyecto/backend/src/main/java/com/typeerror/myt/api/ApiDtos.java:42>) y [backend/src/main/java/com/typeerror/myt/service/ReservaServiceImpl.java:147](<C:/Users/samue/Documents/GitHub Clones/UNI-26-30-Web-Proyecto/backend/src/main/java/com/typeerror/myt/service/ReservaServiceImpl.java:147>).
La API aplica FutureOrPresent únicamente a la fecha: una reserva para hoy a una hora ya pasada es válida. MVC no pasa por ese DTO y el servicio no compara con el momento actual, permitiendo también fechas anteriores. Los mínimos de duración tampoco coinciden: API 15 minutos; servicio mayor que cero.
Corrección: validar fecha y hora juntas, con zona horaria de negocio explícita y reloj inyectable, y centralizar límites en el servicio.
Aceptación: rechazar pasado y duración menor al mínimo por ambas entradas; comprobar cambio de día entre Bogotá y UTC.

### A06 — P2: Mensajes, reseñas y calendario simulan operaciones persistentes
Evidencia: [frontend/src/app/core/services/myt-state.service.ts:440](<C:/Users/samue/Documents/GitHub Clones/UNI-26-30-Web-Proyecto/frontend/src/app/core/services/myt-state.service.ts:440>), [frontend/src/app/core/services/myt-state.service.ts:469](<C:/Users/samue/Documents/GitHub Clones/UNI-26-30-Web-Proyecto/frontend/src/app/core/services/myt-state.service.ts:469>) y [frontend/src/app/core/services/myt-state.service.ts:480](<C:/Users/samue/Documents/GitHub Clones/UNI-26-30-Web-Proyecto/frontend/src/app/core/services/myt-state.service.ts:480>).
Enviar mensajes, publicar reseñas y reprogramar eventos solo actualiza señales locales. No se entrega el mensaje al destinatario ni se persisten reseñas. Reprogramar conserva septiembre de 2026 aunque el usuario elija otro mes. Crear una reserva real no alimenta el calendario de ejemplo.
Corrección: completar API/integración o identificar estas pantallas como demostraciones y deshabilitar acciones que prometen persistencia.
Aceptación: dos sesiones ven el mensaje persistido; las reseñas sobreviven a recargas; el calendario refleja las reservas reales y sus fechas completas.

### A07 — P2: El perfil del tutor muestra calificaciones y reseñas que no le corresponden
Evidencia: [frontend/src/app/pages/tutor-perfil-page/tutor-perfil-page.ts:35](<C:/Users/samue/Documents/GitHub Clones/UNI-26-30-Web-Proyecto/frontend/src/app/pages/tutor-perfil-page/tutor-perfil-page.ts:35>), [frontend/src/app/pages/tutor-perfil-page/tutor-perfil-page.ts:378](<C:/Users/samue/Documents/GitHub Clones/UNI-26-30-Web-Proyecto/frontend/src/app/pages/tutor-perfil-page/tutor-perfil-page.ts:378>) y [frontend/src/app/pages/tutor-perfil-page/tutor-perfil-page.ts:403](<C:/Users/samue/Documents/GitHub Clones/UNI-26-30-Web-Proyecto/frontend/src/app/pages/tutor-perfil-page/tutor-perfil-page.ts:403>).
Una calificación ausente se convierte en 4,9; se suman 124 reseñas al contador y se muestran todas las reseñas locales sin filtrar por tutor. Si falla la consulta, se ignora el error y aparece el perfil de Laura Mendoza.
Corrección: usar datos del tutor seleccionado, estado sin calificaciones y estados de error/ausencia.
Aceptación: tutor sin reseñas aparece sin puntuación inventada; ID inexistente o error no muestra un perfil de reemplazo.

### A08 — P2: El horario seleccionado en el perfil se pierde al reservar
Evidencia: [frontend/src/app/pages/tutor-perfil-page/tutor-perfil-page.ts:49](<C:/Users/samue/Documents/GitHub Clones/UNI-26-30-Web-Proyecto/frontend/src/app/pages/tutor-perfil-page/tutor-perfil-page.ts:49>) y [frontend/src/app/pages/reservas-page/reservas-page.ts:71](<C:/Users/samue/Documents/GitHub Clones/UNI-26-30-Web-Proyecto/frontend/src/app/pages/reservas-page/reservas-page.ts:71>).
El enlace envía fecha y hora, pero la pantalla de reservas solo lee tutor. Además, la disponibilidad de todos los perfiles está fijada a septiembre de 2026, ya pasado en la fecha de esta auditoría.
Corrección: obtener disponibilidad vigente del backend, transportar hora normalizada y leer/validar los parámetros al abrir reservas.
Aceptación: seleccionar un horario vigente conserva exactamente fecha y hora en el formulario y al persistir.

### A09 — P2: Rutas privadas sin guard no restauran la sesión al recargar
Evidencia: [frontend/src/app/app.routes.ts:32](<C:/Users/samue/Documents/GitHub Clones/UNI-26-30-Web-Proyecto/frontend/src/app/app.routes.ts:32>), [frontend/src/app/app.routes.ts:71](<C:/Users/samue/Documents/GitHub Clones/UNI-26-30-Web-Proyecto/frontend/src/app/app.routes.ts:71>) y [frontend/src/app/pages/estudiantes-page/estudiantes-page.ts:135](<C:/Users/samue/Documents/GitHub Clones/UNI-26-30-Web-Proyecto/frontend/src/app/pages/estudiantes-page/estudiantes-page.ts:135>).
Varias rutas no ejecutan sessionGuard. AuthService inicia vacío y App no restaura la sesión globalmente; al recargar /estudiantes o /administradores, los componentes retornan antes de consultar la API y conservan ejemplos, aunque exista cookie válida.
Corrección: agrupar rutas privadas bajo restauración de sesión y permisos por rol; separar demostraciones si deben ser públicas.
Aceptación: abrir una URL privada directamente restaura la sesión y carga datos reales, o redirige al login/denegación.
Alcance: no se constató un bypass de autorización del backend; /api/usuarios sí exige administrador.

### A10 — P2: Los formularios MVC carecen de protección CSRF explícita
Evidencia: [backend/src/main/java/com/typeerror/myt/config/WebConfig.java:20](<C:/Users/samue/Documents/GitHub Clones/UNI-26-30-Web-Proyecto/backend/src/main/java/com/typeerror/myt/config/WebConfig.java:20>) y [backend/src/main/java/com/typeerror/myt/controller/LoginController.java:47](<C:/Users/samue/Documents/GitHub Clones/UNI-26-30-Web-Proyecto/backend/src/main/java/com/typeerror/myt/controller/LoginController.java:47>).
La cabecera obligatoria protege /api/**, pero no los POST MVC. No se encontró token CSRF ni validación de Origin/Referer en esas rutas. SameSite=Strict mitiga peticiones desde otros sitios, pero no sustituye la separación entre orígenes del mismo sitio, como puertos o subdominios. El login MVC también admite POST sin comprobar procedencia.
Corrección: protección CSRF para formularios y autenticación, con tokens y/o una política de origen explícita adecuada al despliegue.
Aceptación: POST desde origen no autorizado rechazado en login, edición y reservas; flujo legítimo operativo.
Alcance: no se ejecutó un ataque en navegador; la explotación de sesiones existentes depende de la topología de orígenes.

### A11 — P2: El despliegue del frontend queda acoplado a localhost
Evidencia: [compose.yaml:14](<C:/Users/samue/Documents/GitHub Clones/UNI-26-30-Web-Proyecto/compose.yaml:14>), [frontend/Dockerfile:8](<C:/Users/samue/Documents/GitHub Clones/UNI-26-30-Web-Proyecto/frontend/Dockerfile:8>) y [backend/src/main/java/com/typeerror/myt/config/WebConfig.java:29](<C:/Users/samue/Documents/GitHub Clones/UNI-26-30-Web-Proyecto/backend/src/main/java/com/typeerror/myt/config/WebConfig.java:29>).
Compose incorpora http://localhost:8080 al frontend y CORS solo permite http://localhost:4200. Al abrir la aplicación desde otra máquina, localhost apunta al visitante. En HTTPS, la URL HTTP también impide un despliegue correcto. Nginx no tiene proxy /api.
Corrección: servir la API bajo el mismo origen mediante proxy o parametrizar URL pública y orígenes permitidos; verificar las cookies según la topología.
Aceptación: autenticación, recarga y CRUD desde un hostname real sin referencias a localhost.
Alcance: la configuración actual sí es válida para la demostración local descrita.

### A12 — P2: Dependencias con avisos de seguridad sin control en CI
Evidencia: resultado npm audit en [audit-npm-2026-10-28.json](./audit-npm-2026-10-28.json), package-lock.json y .github/workflows/ci-cd.yml.
El registro reportó 12 paquetes afectados, todos con corrección disponible. Incluye Angular router y herramientas de construcción/pruebas; no equivale a 12 vulnerabilidades explotables en producción.
El aviso [GHSA-62vg-58rm-qff7](https://github.com/advisories/GHSA-62vg-58rm-qff7) de Angular afecta SSR; este proyecto sirve una SPA estática, por lo que no se atribuye ese impacto al despliegue actual. El aviso [GHSA-587h-7wmj-h5pm](https://github.com/advisories/GHSA-587h-7wmj-h5pm) describe un riesgo de launch-editor/Vite en Windows relevante para revisar el entorno de desarrollo; no demuestra exposición del Nginx de producción.
Corrección: actualizar el lockfile dentro de versiones compatibles, repetir pruebas/build y añadir revisión automatizada de dependencias con excepciones justificadas. No se aplicó npm audit fix automáticamente.
Aceptación: avisos corregidos o documentados por alcance; analizar también dependencias Java y las imágenes.

### A13 — P2: Login sin límite de intentos en la configuración entregada
Evidencia: [backend/src/main/java/com/typeerror/myt/service/LoginService.java:38](<C:/Users/samue/Documents/GitHub Clones/UNI-26-30-Web-Proyecto/backend/src/main/java/com/typeerror/myt/service/LoginService.java:38>), SesionRestController y LoginController.
Cada solicitud intenta validar credenciales; no se encontró limitación por cuenta/IP, espera progresiva ni control equivalente en Nginx. Esto permite intentos automatizados y consumo reiterado de BCrypt si el servicio se expone.
Corrección: límites por cuenta y origen con respuestas 429, métricas y recuperación que evite bloqueos permanentes abusables.
Aceptación: una ráfaga supera el umbral y se frena tanto en MVC como en API. Puede existir protección externa, pero no fue comprobada.

## Documentación y mejoras adicionales

### A14 — P3: README contradice el estado de autenticación Angular
Evidencia: [README.md:56](<C:/Users/samue/Documents/GitHub Clones/UNI-26-30-Web-Proyecto/README.md:56>).
Afirma que Angular todavía no tiene autenticación, aunque existen AuthService, cookies, guards y endpoints integrados. Al mismo tiempo, algunas pantallas sí siguen siendo demostraciones.
Corrección: documentar una matriz por funcionalidad: integrada, parcialmente integrada o demostración; actualizar instrucciones de despliegue.

Otras observaciones, sin elevarlas a bloqueadores independientes:
- Usuarios y reservas se devuelven como listas completas; conviene paginar y medir con volumen real.
- La consulta paginada de tutores incluye colecciones en EntityGraph: revisar SQL y límites en base de datos con un conjunto grande para evitar paginación en memoria.
- El smoke test del contenedor usa create-drop y busca un mensaje de arranque; no valida las migraciones de producción ni una operación HTTP real.
- CI publica la imagen backend; el frontend se compila, pero no tiene un flujo equivalente de publicación.
- Los inputs compartidos tienen etiquetas y soporte de error. Falta una revisión visual y con teclado; el select compartido puede asociar su error mediante aria-describedby.
- Conviene definir en backend las políticas anunciadas en la interfaz, como cancelación gratuita hasta 12 horas antes.
- Hay buena separación entre DTOs y entidades, BCrypt, cookie HttpOnly, validación de firma/emisor/vencimiento, autorización de reservas por propietario, versiones optimistas, restricciones SQL y RLS. Estos controles son fortalezas, no garantía de ausencia de fallos.
- No se encontraron archivos de entorno secretos versionados en la búsqueda de nombres realizada; eso no equivale a escanear todo el contenido o historial.

## Orden de corrección y comprobación
1. Corregir A01–A03: identidad y persistencia de reservas, integridad de datos académicos y concurrencia.
2. Centralizar reglas de agenda/tiempo (A04–A05) y completar o delimitar las funciones de demostración (A06–A09).
3. Completar CSRF, despliegue, actualización de dependencias y límites de login (A10–A13).
4. Añadir pruebas de aceptación de flujo completo: login por rol, registro, reserva, detalle, recarga, cancelación, aislamiento de cuentas y concurrencia. Las pruebas actuales no demuestran estas propiedades aunque la cobertura sea alta.
5. Repetir la verificación sobre checkout limpio con Java 21, revisar navegador/móvil y actualizar documentación (A14).

El alcance de esta entrega es auditoría. Las correcciones descritas quedan pendientes.

