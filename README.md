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
definida. Las pruebas de integracion usan Testcontainers, por lo que Docker debe estar en ejecucion
para completar `verify`.

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

Los proyectos usan el esquema `app`; las migraciones versionadas crean sus tablas, relaciones y
restricciones. RLS esta habilitado para impedir acceso directo desde clientes anonimos; el backend
JDBC se conecta como propietario de la base. La definicion reproducible esta en
`supabase/migrations/` y debe aplicarse en orden cronologico.

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

La aplicacion queda disponible en `http://localhost:8080/usuarios`. Para detenerla usa
`docker compose down`; este comando no elimina ni modifica el proyecto de Supabase.

El registro de estudiante o tutor se abre desde el listado de usuarios y conserva las rutas
`/clientes/nuevo` y `/clientes/editar/{id}` por compatibilidad. Esas rutas ya usan `Usuario`,
roles y el catalogo normalizado de `Materia`; `/clientes` redirige a `/usuarios`.

El CRUD de usuarios esta disponible en `http://localhost:8080/usuarios`. Crear y editar usan
`save()`, mientras que desactivar o activar conserva la fila y cambia unicamente el campo `activo`.
Las contrasenas se guardan como hashes BCrypt y nunca se vuelven a enviar al formulario de edicion.
Los perfiles `dev` y `prod` usan `ddl-auto=validate`: las migraciones versionadas son la unica
fuente de cambios del esquema en cualquier entorno.

## Modelo relacional JPA

Todas las entidades usan persistencia JPA y sus repositorios extienden `JpaRepository`:

- `Usuario` es la identidad comun y puede tener roles de estudiante, tutor y administrador.
- `Estudiante` y `Tutor` se relacionan con su cuenta `Usuario` mediante `@OneToOne`.
- `Reserva` pertenece a un `Estudiante` y a un `Tutor` mediante `@ManyToOne` y `@JoinColumn`.
- `Estudiante` y `Tutor` exponen sus reservas mediante el lado inverso `@OneToMany(mappedBy = ...)`.
- `Materia` se comparte mediante la relacion muchos-a-muchos `tutor_materias`.
- Disponibilidad, bloqueos de agenda y resenas tienen entidades y tablas propias.
- Cada reserva puede tener una conversacion privada con mensajes editables, lectura y borrado logico.

Las asociaciones son `LAZY` y no propagan eliminaciones: una cuenta desactivada o una entidad
eliminada por error no debe borrar en cascada el historial de reservas.

El modelo y el contrato preparado para implementar el chat se documentan en
[docs/domain-model.md](docs/domain-model.md).

La configuracion completa del pipeline, Sonar, Sentry, GHCR y la futura aplicacion Angular esta en
[docs/ci-cd.md](docs/ci-cd.md).
