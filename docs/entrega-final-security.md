# Entrega Final del Proyecto — Spring Boot Security + Angular (MyT)

## 1. Matriz de Cumplimiento de Requisitos

| # | Requisito Obligatorio | Implementación en MyT | Archivos Clave |
| :- | :--- | :--- | :--- |
| **1** | **Spring Security (`SecurityConfig`)** | Dependencia `spring-boot-starter-security` configurada con `@EnableWebSecurity`, `@EnableMethodSecurity`, `SecurityFilterChain` stateless y `JwtAuthenticationFilter`. | `backend/pom.xml`<br>`SecurityConfig.java`<br>`JwtAuthenticationFilter.java` |
| **2** | **Mínimo 3 usuarios de prueba (2 normales, 1 admin)** | `user1@myt.edu.co` (`USER` / `ESTUDIANTE`), `user2@myt.edu.co` (`USER` / `TUTOR`) y `admin@myt.edu.co` (`ADMIN` / `ADMINISTRADOR`). | `MytUserDetailsConfig.java`<br>`LoginService.java` |
| **3** | **Mínimo 2 roles (`USER` y `ADMIN`) con permisos diferentes** | `ROLE_USER` asignado a cuentas normales (`ESTUDIANTE` y `TUTOR`) y `ROLE_ADMIN` asignado a cuentas administrativas (`ADMINISTRADOR`). | `MytUserDetailsConfig.java`<br>`JwtAuthenticationFilter.java`<br>`SecurityConfig.java` |
| **4** | **Inicio y cierre de sesión** | `POST /api/sesion/login` (emite cookie JWT `HttpOnly`), `POST /api/sesion/google` (login con Google) y `POST /api/sesion/logout` (expira cookie con `Max-Age=0`). | `SesionRestController.java`<br>`JwtSesionService.java` |
| **5** | **`PasswordEncoder` con BCrypt** | Bean `BCryptPasswordEncoder` usado en registro, login, usuarios en memoria y restablecimiento de contraseña. | `PasswordConfig.java`<br>`MytUserDetailsConfig.java`<br>`PasswordRecoveryService.java` |
| **6** | **Mínimo 3 tipos de endpoints protegidos** | **1. Público (`permitAll`)**: `GET /api/public/estadisticas`<br>**2. `USER` y `ADMIN` (`hasAnyRole("USER","ADMIN")`)**: `/api/tutores/**`, `/api/reservas/**`, `/api/perfil/**`, `/api/resenas/**`, `/api/chat/**`<br>**3. Exclusivo `ADMIN` (`hasRole("ADMIN")`)**: `/api/usuarios/**`, `/api/estudiantes/**`, `POST /api/tutores` | `SecurityConfig.java`<br>`PublicRestController.java`<br>`UsuarioRestController.java`<br>`TutorRestController.java` |
| **7** | **Restringir funcionalidad real en el backend según rol** | Gestión de usuarios (`/api/usuarios/**`), listado de estudiantes (`/api/estudiantes/**`) y alta administrativa de tutores (`POST /api/tutores`) restringidos en `SecurityFilterChain` y controladores a `ROLE_ADMIN`. | `SecurityConfig.java`<br>`TutorRestController.java`<br>`UsuarioRestController.java` |
| **8** | **Integración con Angular (login + vistas adaptadas por rol)** | Pantalla `/login` con credenciales, Google Auth, recuperación de contraseña y botones rápidos de sustentación; barra lateral e interfaz adaptadas a `ADMIN` vs `USER` y `sessionGuard`. | `login-page.ts`<br>`auth.service.ts`<br>`app.html`<br>`tutores-page.html` |
| **9** | **Manejo de errores (`401` y `403`)** | `AuthenticationEntryPoint` (`401 Unauthorized`) y `AccessDeniedHandler` (`403 Forbidden`) en backend + función `mensajeHttp()` y alertas `[role="alert"]` en Angular. | `SecurityConfig.java`<br>`api.service.ts`<br>`login-page.ts` |
| **10** | **Pruebas de seguridad (mínimo 4 escenarios)** | Suite automatizada `SecurityIntegrationTest` y `SecurityServicesUnitTest` que verifican acceso público (`200`), login válido (`200`), credenciales inválidas (`401`), acceso denegado por rol (`403`), recuperación BCrypt y Google Auth. | `SecurityIntegrationTest.java`<br>`SecurityServicesUnitTest.java` |
| **11** | **Almacenamiento de usuarios (`InMemoryUserDetailsManager`, PostgreSQL `UserDetailsService`, Google Login, Recuperación de contraseñas)** | Coexistencia de `InMemoryUserDetailsManager` y `@Primary` `UserDetailsService` conectado a PostgreSQL (`UsuarioRepository`), además de `GoogleAuthService` y `PasswordRecoveryService` (`app.tokens_recuperacion`). | `MytUserDetailsConfig.java`<br>`GoogleAuthService.java`<br>`PasswordRecoveryService.java`<br>`TokenRecuperacion.java` |
| **12** | **Evidencia de autenticación en Chrome DevTools (JWT: Header, Payload, Signature)** | Documentado paso a paso en la sección 3 de esta guía con valores sensibles ofuscados (`<REDACTED>`). | `docs/entrega-final-security.md` |

---

## 2. Cuentas de Prueba y Almacenamiento Híbrido

### 2.1. Usuarios en Memoria (`InMemoryUserDetailsManager`) y Sincronización de Dominio
Todas las contraseñas se cifran al iniciar la aplicación usando `BCryptPasswordEncoder`:

| Correo | Rol Spring Security | Perfil de Dominio | Contraseña de Prueba (Solo local) | Permisos Principales |
| :--- | :--- | :--- | :--- | :--- |
| `user1@myt.edu.co` | `ROLE_USER` | `ESTUDIANTE` | `<REDACTED_TEST_PASSWORD>` | Explorar tutores, reservar tutorías, chat, reseñas, editar su perfil. **Denegado (`403`)** en `/api/usuarios` y `/api/estudiantes`. |
| `user2@myt.edu.co` | `ROLE_USER` | `TUTOR` | `<REDACTED_TEST_PASSWORD>` | Gestionar su agenda de disponibilidad, confirmar/completar sus reservas, chat. **Denegado (`403`)** en `/api/usuarios` y `/api/estudiantes`. |
| `admin@myt.edu.co` | `ROLE_ADMIN` | `ADMINISTRADOR` | `<REDACTED_TEST_PASSWORD>` | Acceso completo a gestión de usuarios (`/api/usuarios/**`), estudiantes (`/api/estudiantes/**`), alta de tutores (`POST /api/tutores`) y reservas globales. |

*(En el entorno local de laboratorio, los botones de acceso rápido en `http://localhost:4200/login` permiten autenticar cualquiera de estas 3 cuentas con un clic).*

### 2.2. Usuarios en PostgreSQL (`UserDetailsService`)
El bean `@Primary` `UserDetailsService` definido en `MytUserDetailsConfig` consulta en primer lugar `UsuarioRepository.findByCorreoIgnoreCase(...)` sobre la tabla `app.usuarios` en PostgreSQL y traduce automáticamente los roles de base de datos a autoridades de Spring Security (`ROLE_USER`, `ROLE_ADMIN`, `ROLE_ESTUDIANTE`, `ROLE_TUTOR`, `ROLE_ADMINISTRADOR`). Si el correo corresponde a una de las cuentas de prueba en memoria, delega a `InMemoryUserDetailsManager`.

---

## 3. Evidencia de Autenticación en Chrome DevTools (Requisito 12)

### 3.1. ¿Qué mecanismo de autenticación utiliza MyT?
MyT implementa **autenticación Stateless basada en JWT (JSON Web Token)** firmado con **HMAC-SHA256 (`HS256`)** y transportado en una **cookie `HttpOnly` (`myt_sesion`)** con atributos `SameSite=Strict` y `Path=/`, complementado con la cabecera anti-CSRF `X-MYT-Request: 1`.

**¿Por qué JWT en cookie `HttpOnly` en lugar de `localStorage`?**
- Al ser un JWT firmado, el backend no necesita almacenar sesiones en memoria del servidor (`SessionCreationPolicy.STATELESS`).
- Al viajar en una cookie `HttpOnly`, ningún script malicioso en el navegador (XSS) puede leer ni exfiltrar el token mediante `document.cookie` o `localStorage.getItem(...)`.

### 3.2. Cómo mostrar la evidencia en Chrome DevTools durante la sustentación

1. Abrir la aplicación en Chrome (`http://localhost:4200/login`) y presionar `F12` para abrir **Chrome DevTools**.
2. **Pestaña `Network` (Red)**:
   - Iniciar sesión con `user1@myt.edu.co` o `admin@myt.edu.co`.
   - Seleccionar la petición `POST /api/sesion/login` (`Status: 200 OK`).
   - En **Response Headers**, observar la cabecera `Set-Cookie`:
     ```http
     Set-Cookie: myt_sesion=eyJhbGciOiJIUzI1NiJ9.<PAYLOAD_BASE64URL>.<SIGNATURE_REDACTED>; Path=/; Max-Age=28800; HttpOnly; SameSite=Strict
     ```
   - Seleccionar cualquier petición posterior (por ejemplo `GET /api/tutores` o `GET /api/usuarios`) y observar en **Request Headers**:
     ```http
     Cookie: myt_sesion=eyJhbGciOiJIUzI1NiJ9.<PAYLOAD_BASE64URL>.<SIGNATURE_REDACTED>
     X-MYT-Request: 1
     ```
3. **Pestaña `Application` (Aplicación)**:
   - En el menú izquierdo, expandir **Storage -> Cookies -> `http://localhost:4200`**.
   - Se observa la fila de la cookie `myt_sesion` con las columnas:
     - **Name**: `myt_sesion`
     - **Value**: `eyJhbGciOiJIUzI1NiJ9.<PAYLOAD_REDACTED>.<SIGNATURE_REDACTED>`
     - **HttpOnly**: `✓` (activado)
     - **SameSite**: `Strict`

### 3.3. Anatomía de las 3 partes del JWT de MyT (Con valores sensibles ocultos)

Un token JWT consta de tres segmentos codificados en **Base64URL** separados por puntos (`Header.Payload.Signature`):

```text
eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJteXQiLCJzdWIiOiJFU1RVRElBTlRFOjEiLCJwZXJmaWxlcyI6WyJFU1RVRElBTlRFOjEiXSwic2VsZWNjaW9uIjpmYWxzZSwiaWF0IjoxNzYzMzkwMDAwLCJleHAiOjE3NjM0MTg4MDB9.<SIGNATURE_REDACTED>
```

#### 1. Header (Encabezado)
Indica el algoritmo criptográfico empleado para firmar el token:
```json
{
  "alg": "HS256"
}
```

#### 2. Payload (Carga útil / Claims)
Contiene las declaraciones (*claims*) sobre la sesión del usuario autenticado (sin incluir jamás contraseñas ni datos sensibles):
```json
{
  "iss": "myt",
  "sub": "ESTUDIANTE:1",
  "perfiles": [
    "ESTUDIANTE:1"
  ],
  "seleccion": false,
  "iat": 1763390000,
  "exp": 1763418800
}
```
- `iss` (*Issuer*): Emisor del token (`"myt"`).
- `sub` (*Subject*): Perfil activo en formato `<ROL_DOMINIO>:<PERFIL_ID>`.
- `perfiles`: Lista de perfiles autorizados para el usuario.
- `seleccion`: `false` cuando la sesión ya tiene un perfil activo seleccionado; `true` durante la ventana temporal de 5 minutos cuando una cuenta multipropósito aún debe elegir su perfil.
- `iat` (*Issued At*) y `exp` (*Expiration Time*): Marcas de tiempo UNIX de emisión y vencimiento (8 horas por defecto).

#### 3. Signature (Firma criptográfica)
Se calcula en el servidor mediante `NimbusJwtEncoder` usando una clave simétrica secreta de al menos 32 bytes (`JWT_SECRET`):
```text
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  "<JWT_SECRET_REDACTED_MIN_32_BYTES>"
)
```

### 3.4. ¿Cómo valida el backend el JWT en cada petición?

1. **`JwtAuthenticationFilter` (`OncePerRequestFilter`)** intercepta cada petición entrante antes de `UsernamePasswordAuthenticationFilter`.
2. Invoca a **`JwtSesionService.perfiles(request, false)`**, el cual:
   - Extrae la cookie `myt_sesion`.
   - Ejecuta `NimbusJwtDecoder.decode(token)` con algoritmo `MacAlgorithm.HS256` y la clave secreta del servidor.
   - Si algún cliente modificó el `Payload` (por ejemplo, cambiando `ESTUDIANTE:1` por `ADMINISTRADOR:1`), la firma recalculada no coincide con la firma del token y `NimbusJwtDecoder` lanza `JwtException`, rechazando el token.
   - Verifica que el emisor (`iss`) sea `"myt"`, que `seleccion` sea `false` y que la fecha de expiración (`exp`) sea posterior a `Instant.now()`.
3. **`SesionService.resolver(...)`** verifica en base de datos que el usuario y perfil asociados al token existan y sigan activos (`activo = true`). Si un administrador desactiva la cuenta, el token deja de otorgar acceso inmediatamente.
4. **`JwtAuthenticationFilter`** construye un `UsernamePasswordAuthenticationToken` con las autoridades correspondientes (`ROLE_USER` + `ROLE_ESTUDIANTE`/`ROLE_TUTOR`, o `ROLE_ADMIN` + `ROLE_ADMINISTRADOR`) y lo registra en `SecurityContextHolder.getContext().setAuthentication(...)`.
5. **`SecurityFilterChain` (`SecurityConfig`)** evalúa las reglas `.permitAll()`, `.hasAnyRole("USER", "ADMIN")` y `.hasRole("ADMIN")`:
   - Si no hay autenticación válida -> `AuthenticationEntryPoint` responde `401 Unauthorized`.
   - Si el usuario tiene `ROLE_USER` e intenta invocar un endpoint exclusivo de `ROLE_ADMIN` (`/api/usuarios/**`, `/api/estudiantes/**`, `POST /api/tutores`) -> `AccessDeniedHandler` responde `403 Forbidden`.
