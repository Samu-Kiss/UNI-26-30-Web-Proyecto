# MyT

Aplicacion web de tutorias construida con Spring Boot 4 y Java 21.

## Desarrollo local

```bash
# Solo es necesario si el checkout no preservo el permiso ejecutable.
chmod +x mvnw
./mvnw verify
./mvnw spring-boot:run
```

`verify` compila, ejecuta Checkstyle y las pruebas, y genera el reporte JaCoCo en
`target/site/jacoco/index.html`. Sentry no envia datos en local mientras `SENTRY_DSN` no este
definida.

## PostgreSQL y Supabase

La aplicacion persiste los clientes con Spring Data JPA. Para desarrollo local espera PostgreSQL en
`localhost:5432`, base `myt`, usuario `postgres` y contrasena `postgres`. La configuracion se puede
reemplazar con `SUPABASE_DB_URL`.

Para Supabase, copia desde **Connect** la URL JDBC del **Session pooler** (puerto `5432`) y agrega
`sslmode=require`. No uses el Transaction pooler del puerto `6543` como fuente principal de
Hibernate, porque no admite las sentencias preparadas que utiliza el ORM. Guarda la URL solamente
en una variable de entorno; `.env.example` contiene el formato esperado.

Como Supabase expone el esquema `public` mediante su Data API, crea un esquema exclusivo para el
backend desde el SQL Editor y configuralo con `DB_SCHEMA=app`:

```sql
create schema if not exists app;
```

```bash
export SUPABASE_DB_URL='jdbc:postgresql://HOST:5432/postgres?user=USUARIO&password=CLAVE&sslmode=require'
export DB_SCHEMA=app
./mvnw spring-boot:run
```

El CRUD de clientes esta disponible en `http://localhost:8080/clientes`. Crear y editar usan
`save()`, mientras que desactivar o activar conserva la fila y cambia unicamente el campo `activo`.
Las contrasenas se guardan como hashes BCrypt y nunca se vuelven a enviar al formulario de edicion.
La aplicacion usa `ddl-auto=update` por defecto para este laboratorio; antes de produccion conviene
reemplazarlo por migraciones versionadas y `JPA_DDL_AUTO=validate`.

## Modelo relacional JPA

Todas las entidades usan persistencia JPA y sus repositorios extienden `JpaRepository`:

- `Estudiante` y `Tutor` se relacionan con su cuenta `Cliente` mediante `@OneToOne`.
- `Reserva` pertenece a un `Estudiante` y a un `Tutor` mediante `@ManyToOne` y `@JoinColumn`.
- `Estudiante` y `Tutor` exponen sus reservas mediante el lado inverso `@OneToMany(mappedBy = ...)`.
- Las materias de `Tutor` son valores simples persistidos con `@ElementCollection` y
  `@CollectionTable`.

Las asociaciones son `LAZY` y no propagan eliminaciones: una cuenta desactivada o una entidad
eliminada por error no debe borrar en cascada el historial de reservas.

La configuracion completa del pipeline, Sonar, Sentry, GHCR y la futura aplicacion Angular esta en
[docs/ci-cd.md](docs/ci-cd.md).
