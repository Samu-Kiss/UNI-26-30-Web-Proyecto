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

La aplicacion persiste el modelo con Spring Data JPA y tiene dos perfiles aislados:

- `dev` es el perfil predeterminado y apunta a `UNI-26-30-Web-Proyecto-DEV`.
- `prod` solo se activa explicitamente y apunta a `UNI-26-3-Web-Poyecto`.

Para Supabase, copia desde **Connect** la URL JDBC del **Session pooler** (puerto `5432`) y agrega
`sslmode=require`. No uses el Transaction pooler del puerto `6543` como fuente principal de
Hibernate, porque no admite las sentencias preparadas que utiliza el ORM. Las contrasenas se pasan
por separado, por lo que no necesitan codificarse dentro de la URL JDBC.

Como Supabase expone el esquema `public` mediante su Data API, crea un esquema exclusivo para el
backend desde el SQL Editor y configuralo con `DB_SCHEMA=app`:

```sql
create schema if not exists app;
```

Los dos proyectos ya tienen el esquema `app`, las seis tablas y sus llaves foraneas. RLS esta
habilitado para impedir acceso directo desde clientes anonimos; el backend JDBC se conecta como
propietario de la base. La definicion reproducible esta en
`supabase/migrations/20260831150000_create_app_schema.sql`.

Para desarrollo, completa `SUPABASE_DEV_DB_PASSWORD` en `.env.local`. Conserva
`SPRING_PROFILES_ACTIVE=dev`; Spring carga ese archivo automaticamente al iniciar desde IntelliJ o
Maven.

Para produccion define `SPRING_PROFILES_ACTIVE=prod` y `SUPABASE_PROD_DB_PASSWORD` en el entorno
del proveedor donde se despliegue el backend. El perfil de produccion usa `ddl-auto=validate`, de
modo que nunca modifica tablas implicitamente.

### Docker conectado a Supabase

El archivo `compose.yaml` ejecuta el backend local y carga la conexion de desarrollo desde
`.env.local`, que esta ignorado por Git. Completa `SUPABASE_DEV_DB_PASSWORD` y ejecuta:

```bash
docker compose up --build
```

La aplicacion queda disponible en `http://localhost:8080/clientes`. Para detenerla usa
`docker compose down`; este comando no elimina ni modifica el proyecto de Supabase.

El CRUD de clientes esta disponible en `http://localhost:8080/clientes`. Crear y editar usan
`save()`, mientras que desactivar o activar conserva la fila y cambia unicamente el campo `activo`.
Las contrasenas se guardan como hashes BCrypt y nunca se vuelven a enviar al formulario de edicion.
El perfil `dev` usa `ddl-auto=update` para el laboratorio. El perfil `prod` valida el esquema y debe
recibir cambios mediante migraciones versionadas antes del despliegue.

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
