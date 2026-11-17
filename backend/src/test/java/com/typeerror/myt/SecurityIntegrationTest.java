package com.typeerror.myt;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashSet;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.typeerror.myt.config.MytUserDetailsConfig;
import com.typeerror.myt.entities.Estudiante;
import com.typeerror.myt.entities.Materia;
import com.typeerror.myt.entities.RolUsuario;
import com.typeerror.myt.entities.Usuario;
import com.typeerror.myt.repository.EstudianteRepository;
import com.typeerror.myt.repository.MateriaRepository;
import com.typeerror.myt.repository.UsuarioRepository;
import com.typeerror.myt.service.JwtSesionService;

import jakarta.servlet.http.Cookie;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class SecurityIntegrationTest extends PostgreSqlIntegrationTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private InMemoryUserDetailsManager inMemoryUserDetailsManager;

    @Autowired
    private UserDetailsService userDetailsService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private EstudianteRepository estudianteRepository;

    @Autowired
    private MateriaRepository materiaRepository;

    @BeforeEach
    void restaurarClavesEnMemoria() {
        String hash = passwordEncoder.encode(MytUserDetailsConfig.CLAVE_PRUEBA_INMEMORY);
        for (String correo : new String[] {
            MytUserDetailsConfig.USER_ESTUDIANTE_EMAIL,
            MytUserDetailsConfig.USER_TUTOR_EMAIL,
            MytUserDetailsConfig.ADMIN_EMAIL
        }) {
            if (inMemoryUserDetailsManager.userExists(correo)) {
                UserDetails actual = inMemoryUserDetailsManager.loadUserByUsername(correo);
                inMemoryUserDetailsManager.updatePassword(actual, hash);
            }
        }
    }

    @Test
    void escenario1AccesoAEndpointPublicoSinAutenticacion() throws Exception {
        materiaRepository.save(new Materia(null, "Seguridad Informática"));

        mvc.perform(get("/api/public/estadisticas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.plataforma").value("MyT — Plataforma de Tutorías Académicas"))
                .andExpect(jsonPath("$.estado").value("OPERATIVO"))
                .andExpect(jsonPath("$.materiasActivas").isNumber());
    }

    @Test
    void escenario2InicioDeSesionCorrectoConInMemoryYPostgreSql() throws Exception {
        // Verificar los 3 usuarios de prueba en InMemoryUserDetailsManager (2 USER y 1 ADMIN)
        assertTrue(inMemoryUserDetailsManager.userExists(MytUserDetailsConfig.USER_ESTUDIANTE_EMAIL));
        assertTrue(inMemoryUserDetailsManager.userExists(MytUserDetailsConfig.USER_TUTOR_EMAIL));
        assertTrue(inMemoryUserDetailsManager.userExists(MytUserDetailsConfig.ADMIN_EMAIL));

        UserDetails user1 = userDetailsService.loadUserByUsername(
                MytUserDetailsConfig.USER_ESTUDIANTE_EMAIL);
        UserDetails user2 = userDetailsService.loadUserByUsername(
                MytUserDetailsConfig.USER_TUTOR_EMAIL);
        UserDetails admin = userDetailsService.loadUserByUsername(
                MytUserDetailsConfig.ADMIN_EMAIL);

        assertTrue(user1.getPassword().startsWith("$2a$"));
        assertTrue(passwordEncoder.matches(
                MytUserDetailsConfig.CLAVE_PRUEBA_INMEMORY, user1.getPassword()));
        assertTrue(tieneAutoridad(user1, "ROLE_USER"));
        assertTrue(tieneAutoridad(user2, "ROLE_USER"));
        assertTrue(tieneAutoridad(admin, "ROLE_ADMIN"));

        // Login con usuario normal 1 (InMemory -> USER / ESTUDIANTE)
        Cookie cookieUser1 = autenticar(
                MytUserDetailsConfig.USER_ESTUDIANTE_EMAIL,
                MytUserDetailsConfig.CLAVE_PRUEBA_INMEMORY,
                "ESTUDIANTE",
                "USER");
        assertTrue(cookieUser1.isHttpOnly());

        // Login con usuario normal 2 (InMemory -> USER / TUTOR)
        Cookie cookieUser2 = autenticar(
                MytUserDetailsConfig.USER_TUTOR_EMAIL,
                MytUserDetailsConfig.CLAVE_PRUEBA_INMEMORY,
                "TUTOR",
                "USER");
        assertTrue(cookieUser2.isHttpOnly());

        // Login con administrador (InMemory -> ADMIN / ADMINISTRADOR)
        Cookie cookieAdmin = autenticar(
                MytUserDetailsConfig.ADMIN_EMAIL,
                MytUserDetailsConfig.CLAVE_PRUEBA_INMEMORY,
                "ADMINISTRADOR",
                "ADMIN");
        assertTrue(cookieAdmin.isHttpOnly());

        // Login con usuario almacenado en PostgreSQL
        Usuario pgUser = new Usuario();
        pgUser.setNombre("Valeria");
        pgUser.setApellido("Postgres");
        pgUser.setCorreo("valeria.pg@myt.edu.co");
        pgUser.setContrasena(passwordEncoder.encode("ClavePostgres2026!"));
        pgUser.setRoles(new HashSet<>(Set.of(RolUsuario.ESTUDIANTE)));
        pgUser = usuarioRepository.save(pgUser);
        estudianteRepository.save(new Estudiante(
                null, pgUser, "PG-001", "Javeriana", "Sistemas", 6));

        UserDetails detallesPg = userDetailsService.loadUserByUsername("valeria.pg@myt.edu.co");
        assertTrue(tieneAutoridad(detallesPg, "ROLE_USER"));

        Cookie cookiePg = autenticar(
                "valeria.pg@myt.edu.co", "ClavePostgres2026!", "ESTUDIANTE", "USER");
        assertNotNull(cookiePg);

        // Cierre de sesión limpia la cookie JWT
        var logoutRes = mvc.perform(post("/api/sesion/logout")
                        .cookie(cookiePg)
                        .header("X-MYT-Request", "1"))
                .andExpect(status().isOk())
                .andReturn();
        Cookie cookieCerrada = logoutRes.getResponse().getCookie(JwtSesionService.COOKIE);
        assertNotNull(cookieCerrada);
        assertTrue(cookieCerrada.getValue().isEmpty());
    }

    @Test
    void escenario3IntentoDeInicioDeSesionConCredencialesIncorrectas() throws Exception {
        // Contraseña incorrecta para cuenta existente en memoria
        mvc.perform(post("/api/sesion/login")
                        .header("X-MYT-Request", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"correo":"user1@myt.edu.co","contrasena":"ClaveErronea999!"}
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.mensaje").value("Correo o contraseña incorrectos"));

        // Usuario inexistente
        mvc.perform(post("/api/sesion/login")
                        .header("X-MYT-Request", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"correo":"noexiste@myt.edu.co","contrasena":"1ManzanaGrande!"}
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.mensaje").value("Correo o contraseña incorrectos"));
    }

    @Test
    void escenario4AccesoDenegadoAOperacionPorFaltaDePermisos() throws Exception {
        Cookie cookieUser = autenticar(
                MytUserDetailsConfig.USER_ESTUDIANTE_EMAIL,
                MytUserDetailsConfig.CLAVE_PRUEBA_INMEMORY,
                "ESTUDIANTE",
                "USER");
        Cookie cookieAdmin = autenticar(
                MytUserDetailsConfig.ADMIN_EMAIL,
                MytUserDetailsConfig.CLAVE_PRUEBA_INMEMORY,
                "ADMINISTRADOR",
                "ADMIN");

        // Sin autenticación -> 401 Unauthorized en endpoints protegidos
        mvc.perform(get("/api/tutores"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.mensaje").exists());
        mvc.perform(get("/api/usuarios"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.mensaje").exists());

        // Endpoint accesible para USER y ADMIN (/api/tutores) -> 200 OK para ambos
        mvc.perform(get("/api/tutores").cookie(cookieUser))
                .andExpect(status().isOk());
        mvc.perform(get("/api/tutores").cookie(cookieAdmin))
                .andExpect(status().isOk());

        // Endpoints exclusivos de ADMIN invocados por un USER -> 403 Forbidden en el backend
        mvc.perform(get("/api/usuarios").cookie(cookieUser))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.mensaje").exists());

        mvc.perform(get("/api/estudiantes").cookie(cookieUser))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.mensaje").exists());

        mvc.perform(delete("/api/usuarios/1")
                        .cookie(cookieUser)
                        .header("X-MYT-Request", "1"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.mensaje").exists());

        mvc.perform(post("/api/tutores")
                        .cookie(cookieUser)
                        .header("X-MYT-Request", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"usuarioId":1,"biografia":"Intento no autorizado",
                                 "tarifaPorHora":40000,"materiaIds":[1]}
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.mensaje").exists());

        // Los mismos endpoints exclusivos invocados por ADMIN -> 200 OK
        mvc.perform(get("/api/usuarios").cookie(cookieAdmin))
                .andExpect(status().isOk());
        mvc.perform(get("/api/estudiantes").cookie(cookieAdmin))
                .andExpect(status().isOk());
    }

    @Test
    void escenario5RecuperacionDeContrasenaYLoginConGoogle() throws Exception {
        // 1. Solicitar recuperación de contraseña
        var solicitud = mvc.perform(post("/api/sesion/recuperar")
                        .header("X-MYT-Request", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"correo":"user1@myt.edu.co"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tokenRecuperacion").isString())
                .andReturn();

        String body = solicitud.getResponse().getContentAsString();
        String token = body.replaceAll(".*\"tokenRecuperacion\"\\s*:\\s*\"([^\"]+)\".*", "$1");
        assertTrue(token.startsWith("MYT-"));

        // 2. Restablecer contraseña con BCrypt
        mvc.perform(post("/api/sesion/restablecer")
                        .header("X-MYT-Request", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"token":"%s","nuevaContrasena":"NuevaClaveBCrypt2026!"}
                                """.formatted(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mensaje").exists());

        // El token es de un solo uso -> segundo intento falla con 400
        mvc.perform(post("/api/sesion/restablecer")
                        .header("X-MYT-Request", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"token":"%s","nuevaContrasena":"OtraClaveDiferente2026!"}
                                """.formatted(token)))
                .andExpect(status().isBadRequest());

        // La contraseña anterior ya no funciona y la nueva sí autentica
        mvc.perform(post("/api/sesion/login")
                        .header("X-MYT-Request", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"correo":"user1@myt.edu.co","contrasena":"1ManzanaGrande!"}
                                """))
                .andExpect(status().isUnauthorized());

        autenticar("user1@myt.edu.co", "NuevaClaveBCrypt2026!", "ESTUDIANTE", "USER");

        // Restaurar la clave original del bean en memoria para independencia entre tests
        UserDetails actualizado = inMemoryUserDetailsManager.loadUserByUsername(
                MytUserDetailsConfig.USER_ESTUDIANTE_EMAIL);
        inMemoryUserDetailsManager.updatePassword(
                actualizado,
                passwordEncoder.encode(MytUserDetailsConfig.CLAVE_PRUEBA_INMEMORY));

        // 3. Inicio de sesión con Google vía Supabase OAuth (URL de autorización + verificación JWT)
        mvc.perform(get("/api/sesion/google/url")
                        .param("redirectTo", "http://localhost:4200/login"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.provider").value("google"))
                .andExpect(jsonPath("$.url").isString());

        mvc.perform(get("/api/sesion/oauth2/google")
                        .param("redirectTo", "http://localhost:4200/login"))
                .andExpect(status().is3xxRedirection());

        String header = Base64.getUrlEncoder().withoutPadding()
                .encodeToString("{\"alg\":\"HS256\"}".getBytes(StandardCharsets.UTF_8));
        String payload = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(("{\"sub\":\"9d8f7a6b-0001\","
                        + "\"email\":\"camila.google@javeriana.edu.co\","
                        + "\"user_metadata\":{\"full_name\":\"Camila Google\"}}")
                        .getBytes(StandardCharsets.UTF_8));
        String fakeGoogleJwt = header + "." + payload + ".signature";

        var googleRes = mvc.perform(post("/api/sesion/google")
                        .header("X-MYT-Request", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"credencial":"%s"}
                                """.formatted(fakeGoogleJwt)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.actual.rol").value("ESTUDIANTE"))
                .andExpect(jsonPath("$.actual.nombreUsuario").value("Camila Google"))
                .andReturn();

        Cookie googleCookie = googleRes.getResponse().getCookie(JwtSesionService.COOKIE);
        assertNotNull(googleCookie);
        assertTrue(googleCookie.isHttpOnly());
        assertFalse(googleCookie.getValue().isBlank());

        // Si el usuario ya existía con un nombre previo/placeholder, el JWT de Google sincroniza su nombre real
        String payloadActualizado = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(("{\"sub\":\"9d8f7a6b-0001\","
                        + "\"email\":\"camila.google@javeriana.edu.co\","
                        + "\"user_metadata\":{\"full_name\":\"Samuel Pico\"}}")
                        .getBytes(StandardCharsets.UTF_8));
        String jwtActualizado = header + "." + payloadActualizado + ".signature";

        mvc.perform(post("/api/sesion/google")
                        .header("X-MYT-Request", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"credencial":"%s"}
                                """.formatted(jwtActualizado)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.actual.rol").value("ESTUDIANTE"))
                .andExpect(jsonPath("$.actual.nombreUsuario").value("Samuel Pico"));
    }

    private Cookie autenticar(String correo, String contrasena, String rolDominio,
            String rolSeguridad) throws Exception {
        var result = mvc.perform(post("/api/sesion/login")
                        .header("X-MYT-Request", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"correo":"%s","contrasena":"%s"}
                                """.formatted(correo, contrasena)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.actual.rol").value(rolDominio))
                .andExpect(jsonPath("$.actual.rolSeguridad").value(rolSeguridad))
                .andReturn();
        Cookie cookie = result.getResponse().getCookie(JwtSesionService.COOKIE);
        assertNotNull(cookie);
        return cookie;
    }

    private boolean tieneAutoridad(UserDetails detalles, String autoridad) {
        return detalles.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(autoridad::equals);
    }
}
