# Migracion inicial de tutores a Angular

## Alcance

Se migro como ejercicio la vista Thymeleaf `tutores.html`. El original se conserva y el backend
Spring Boot, sus controladores, servicios, repositorios, entidades JPA y la base de datos no fueron
modificados. La nueva vista vive en `frontend/` y usa tres tutores temporales para construir y
probar la interfaz antes de conectarla a una API.

## Atomic Design

- Atomos: marca MyT y etiqueta de disponibilidad.
- Molecula: resumen del tutor, que combina avatar, nombre y materias.
- Organismo: listado de tutores con tabla, tarifa, calificacion, estado y accion.
- Pagina: pantalla de tutores con encabezado y listado completo.

## Equivalencias del laboratorio

`th:each` se reemplazo por `@for` y `th:text` por interpolaciones `{{ }}`. Los datos temporales se
encuentran en `tutores-page.ts`; no sustituyen la base de datos.

## Respuestas de comprobacion

1. Se escogio la vista Thymeleaf de tutores.
2. El componente representa el listado donde un estudiante consulta materias, tarifas,
   calificaciones y disponibilidad de tutores.
3. Los datos estan temporalmente en el arreglo `tutores` de `TutoresPageComponent`.
4. `@for` reemplazo a `th:each`.
5. La interpolacion `{{ valor }}` reemplazo a `th:text`.
6. Se conservaron Spring Boot, los controladores, servicios, repositorios, entidades JPA y la base
   de datos.

## Observabilidad

El SDK `@sentry/angular` captura errores globales y trazas de navegacion. Se inicializa solo si
`runtime-config.js` contiene un DSN. El build de produccion genera mapas de codigo ocultos; CI los
inyecta y sube con `sentry-cli`, y despues elimina los archivos `.map` del artefacto publico.

Para verificar la captura sin exponer el control durante el uso normal, inicie el frontend con
`SENTRY_DSN` configurado y abra `http://localhost:4200/?sentry-test=1`. El boton de diagnostico
lanza `Sentry Test Error` a traves del `ErrorHandler` de Angular. Sin el parametro o sin DSN, el
control no se renderiza.

La verificacion real se ejecuto el 21 de septiembre de 2026 con el entorno
`local-verification`. Sentry confirmo el envio de `Sentry Test Error` con el identificador de evento
`1e181d78f68f472eae05082fa1444b3e`.
