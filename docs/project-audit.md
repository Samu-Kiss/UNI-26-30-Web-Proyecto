# Project audit

Fecha: 2026-09-03

## Alcance

Se revisaron la arquitectura Spring MVC/JPA, controladores, servicios, repositorios, entidades,
plantillas Thymeleaf, migraciones SQL, perfiles de configuracion, pruebas, Docker y CI/CD. El mapa
estructural se contrasto con CodeGraph (44 archivos, 544 simbolos y 858 relaciones despues de la
limpieza), Checkstyle, el compilador de Java y Maven.

## Corregido

- Se agregaron las vistas que faltaban para `/administradores`, `/estudiantes` y `/tutores`. Antes,
  los controladores publicaban esas rutas pero Thymeleaf no podia resolver sus plantillas.
- Se agrego una prueba de regresion para los cuatro listados web publicados.
- Docker ahora usa Java 21 en compilacion y ejecucion, igual que Maven y CI.
- Se elimino `@Autowired` redundante de los constructores unicos; la inyeccion continua siendo
  explicita, inmutable y compatible con Spring.
- Se retiraron metadatos Maven vacios generados por el scaffolding.
- `.codegraph/` y `.codex-tmp/` quedaron fuera de Git y del contexto de Docker.
- El README ahora refleja que ambos perfiles validan el esquema y que `verify` requiere Docker para
  ejecutar Testcontainers.

## Estado de calidad

- Checkstyle: 0 infracciones.
- Compilacion de produccion y pruebas con objetivo Java 21: correcta.
- Empaquetado Spring Boot: correcto.
- `git diff --check`: correcto.
- Suite completa: requiere un daemon Docker accesible. En el entorno de esta auditoria Docker no
  estaba disponible, por lo que la ejecucion integral no pudo completarse. La ultima ejecucion
  registrada antes de la auditoria tenia 4 pruebas aprobadas y 1 prueba de Sentry omitida.

## Riesgos pendientes

1. **Autorizacion**: las rutas administrativas no tienen autenticacion ni control de acceso. Antes de
   exponer la aplicacion fuera de un entorno de laboratorio se debe definir el modelo de seguridad.
2. **Errores HTTP**: editar un cliente inexistente termina en una excepcion generica y activar o
   desactivar un identificador inexistente se ignora. Conviene acordar una politica uniforme (404 o
   mensaje de interfaz) antes de cambiar el comportamiento.
3. **Migraciones**: Hibernate usa `validate`, pero la aplicacion no ejecuta Flyway o Liquibase. El
   despliegue depende de aplicar previamente las migraciones de Supabase de forma externa.
4. **Cobertura**: la suite es pequena y depende casi por completo de PostgreSQL/Testcontainers.
   Faltan pruebas unitarias rapidas para validacion, errores y concurrencia del servicio de clientes.
5. **API sin consumidores actuales**: CodeGraph no encontro consumidores de `findById` en los
   servicios de administradores, estudiantes, tutores y reservas. Se conservaron porque encajan con
   futuras vistas de detalle; se pueden retirar si ese alcance no existe.
6. **Concurrencia**: las entidades no usan versionado optimista (`@Version`). Dos ediciones
   simultaneas pueden sobrescribir cambios sin advertencia.

## Dependencias

El analizador de Maven marca los starters de Spring como no usados y sus modulos transitivos como no
declarados, un falso positivo habitual en dependencias agregadoras. No se elimino ninguna dependencia
porque todas corresponden a una capacidad activa: MVC/Thymeleaf, JPA/PostgreSQL, validacion, BCrypt,
Sentry, pruebas Spring y Testcontainers.
