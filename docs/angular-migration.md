# Angular conectado a Spring Boot

La migración inicial usó tres tutores temporales. La entrega actual los sustituye por
`ApiService`, consultas paginadas a PostgreSQL y sesión JWT en cookie HttpOnly.

Consulta [la guía de entrega 2](entrega-2.md) para arranque, cuentas de demo, ocho operaciones
HTTP, tres consultas JPQL, matriz de requisitos y guion individual.

Se conservan los átomos, moléculas y organismos de Atomic Design. `TutorEditorComponent`
implementa el editor reactivo con comunicación padre/hijo; las páginas conectan formularios,
servicios y rutas. Las vistas MVC de la primera entrega permanecen en el backend.

Sentry solo se inicializa con DSN en runtime-config.js. El diagnóstico se activa con
?sentry-test=1; CI administra los mapas según [ci-cd.md](ci-cd.md).
