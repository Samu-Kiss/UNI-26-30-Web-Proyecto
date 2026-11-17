package com.typeerror.myt;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.typeerror.myt.api.ApiExceptionHandler;
import com.typeerror.myt.api.ApiInterceptor;
import com.typeerror.myt.api.EstudianteRestController;
import com.typeerror.myt.api.PublicRestController;
import com.typeerror.myt.api.SesionRestController;
import com.typeerror.myt.api.TutorRestController;
import com.typeerror.myt.api.UsuarioRestController;
import com.typeerror.myt.config.MytUserDetailsConfig;
import com.typeerror.myt.config.PasswordConfig;
import com.typeerror.myt.config.SecurityConfig;
import com.typeerror.myt.config.SesionInterceptor;
import com.typeerror.myt.config.WebConfig;
import com.typeerror.myt.entities.Materia;
import com.typeerror.myt.entities.RolUsuario;
import com.typeerror.myt.repository.EstudianteRepository;
import com.typeerror.myt.repository.MateriaRepository;
import com.typeerror.myt.repository.TokenRecuperacionRepository;
import com.typeerror.myt.repository.TutorRepository;
import com.typeerror.myt.repository.UsuarioRepository;
import com.typeerror.myt.service.ContextoSesion;
import com.typeerror.myt.service.EstudianteService;
import com.typeerror.myt.service.GoogleAuthService;
import com.typeerror.myt.service.JwtSesionService;
import com.typeerror.myt.service.LoginService;
import com.typeerror.myt.service.PasswordRecoveryService;
import com.typeerror.myt.service.RegistroUsuarioService;
import com.typeerror.myt.service.SesionService;
import com.typeerror.myt.service.UsuarioAutenticado;
import com.typeerror.myt.service.UsuarioService;

import jakarta.servlet.http.Cookie;

@WebMvcTest(controllers = {
    PublicRestController.class,
    SesionRestController.class,
    UsuarioRestController.class,
    TutorRestController.class,
    EstudianteRestController.class
})
@Import({
    SecurityConfig.class,
    MytUserDetailsConfig.class,
    PasswordConfig.class,
    WebConfig.class,
    ApiInterceptor.class,
    SesionInterceptor.class,
    ApiExceptionHandler.class,
    JwtSesionService.class
})
class SecurityFilterChainTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private JwtSesionService jwt;

    @Autowired
    private InMemoryUserDetailsManager inMemoryUserDetailsManager;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockitoBean
    private UsuarioRepository usuarioRepository;

    @MockitoBean
    private EstudianteRepository estudianteRepository;

    @MockitoBean
    private EstudianteService estudianteService;

    @MockitoBean
    private TutorRepository tutorRepository;

    @MockitoBean
    private MateriaRepository materiaRepository;

    @MockitoBean
    private TokenRecuperacionRepository tokenRecuperacionRepository;

    @MockitoBean
    private SesionService sesionService;

    @MockitoBean
    private LoginService loginService;

    @MockitoBean
    private PasswordRecoveryService passwordRecoveryService;

    @MockitoBean
    private GoogleAuthService googleAuthService;

    @MockitoBean
    private RegistroUsuarioService registroUsuarioService;

    @MockitoBean
    private UsuarioService usuarioService;

    @BeforeEach
    void configurarMocks() {
        when(materiaRepository.findAll(any(Sort.class)))
                .thenReturn(List.of(new Materia(1, "Arquitectura Web")));
        when(tutorRepository.findAll()).thenReturn(List.of());
        when(usuarioRepository.findAll()).thenReturn(List.of());
        when(estudianteRepository.findAll()).thenReturn(List.of());
        when(estudianteService.findAll()).thenReturn(List.of());

        when(sesionService.resolver("ESTUDIANTE:101")).thenReturn(Optional.of(
                new ContextoSesion(RolUsuario.ESTUDIANTE, 101, "Sofía Estudiante")));
        when(sesionService.resolver("TUTOR:102")).thenReturn(Optional.of(
                new ContextoSesion(RolUsuario.TUTOR, 102, "Carlos Tutor")));
        when(sesionService.resolver("ADMINISTRADOR:1")).thenReturn(Optional.of(
                new ContextoSesion(RolUsuario.ADMINISTRADOR, 1, "Administrador MyT")));
    }

    @Test
    void verificaLosCuatroEscenariosDeSeguridadEnSecurityFilterChain() throws Exception {
        // 1. Acceso a endpoint público sin autenticación -> 200 OK
        mvc.perform(get("/api/public/estadisticas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("OPERATIVO"))
                .andExpect(jsonPath("$.materiasActivas").value(1));

        // Verificar que InMemoryUserDetailsManager tiene los 3 usuarios con BCrypt
        assertTrue(inMemoryUserDetailsManager.userExists("user1@myt.edu.co"));
        assertTrue(inMemoryUserDetailsManager.userExists("user2@myt.edu.co"));
        assertTrue(inMemoryUserDetailsManager.userExists("admin@myt.edu.co"));
        assertTrue(passwordEncoder.matches("1ManzanaGrande!",
                inMemoryUserDetailsManager.loadUserByUsername("user1@myt.edu.co").getPassword()));

        // 2. Inicio de sesión correcto -> 200 OK y cookie HttpOnly
        when(loginService.autenticar("user1@myt.edu.co", "1ManzanaGrande!"))
                .thenReturn(List.of(new UsuarioAutenticado(RolUsuario.ESTUDIANTE, 101)));

        var loginOk = mvc.perform(post("/api/sesion/login")
                        .header("X-MYT-Request", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"correo\":\"user1@myt.edu.co\",\"contrasena\":\"1ManzanaGrande!\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.actual.rol").value("ESTUDIANTE"))
                .andExpect(jsonPath("$.actual.rolSeguridad").value("USER"))
                .andReturn();

        Cookie cookieUser = loginOk.getResponse().getCookie(JwtSesionService.COOKIE);
        assertNotNull(cookieUser);
        assertTrue(cookieUser.isHttpOnly());

        // 3. Intento de inicio de sesión con credenciales incorrectas -> 401 Unauthorized
        when(loginService.autenticar("user1@myt.edu.co", "ClaveErronea"))
                .thenReturn(List.of());

        mvc.perform(post("/api/sesion/login")
                        .header("X-MYT-Request", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"correo\":\"user1@myt.edu.co\",\"contrasena\":\"ClaveErronea\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.mensaje").value("Correo o contraseña incorrectos"));

        // 4. Acceso denegado a operación por falta de permisos (USER vs ADMIN)
        // 4a. Sin cookie -> 401 Unauthorized
        mvc.perform(get("/api/tutores"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.mensaje").value("Inicia sesión de nuevo"));

        // 4b. Con rol USER -> puede consultar /api/tutores (200 OK), pero recibe 403 en /api/usuarios
        mvc.perform(get("/api/tutores").cookie(cookieUser))
                .andExpect(status().isOk());

        mvc.perform(get("/api/usuarios").cookie(cookieUser))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.mensaje").exists());

        mvc.perform(get("/api/estudiantes").cookie(cookieUser))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.mensaje").exists());

        mvc.perform(delete("/api/usuarios/1")
                        .cookie(cookieUser)
                        .header("X-MYT-Request", "1"))
                .andExpect(status().isForbidden());

        mvc.perform(post("/api/tutores")
                        .cookie(cookieUser)
                        .header("X-MYT-Request", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"usuarioId\":1,\"biografia\":\"Bio\",\"tarifaPorHora\":30000,\"materiaIds\":[1]}"))
                .andExpect(status().isForbidden());

        // 4c. Con rol ADMIN -> 200 OK en endpoints administrativos exclusivos
        Cookie cookieAdmin = new Cookie(
                JwtSesionService.COOKIE,
                jwt.emitir(List.of("ADMINISTRADOR:1"), false));

        mvc.perform(get("/api/usuarios").cookie(cookieAdmin))
                .andExpect(status().isOk());

        mvc.perform(get("/api/estudiantes").cookie(cookieAdmin))
                .andExpect(status().isOk());
    }
}
