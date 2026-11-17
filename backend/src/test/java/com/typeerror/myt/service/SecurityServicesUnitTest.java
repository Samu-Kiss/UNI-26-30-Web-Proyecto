package com.typeerror.myt.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Sort;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.web.server.ResponseStatusException;

import com.typeerror.myt.api.PublicRestController;
import com.typeerror.myt.config.JwtAuthenticationFilter;
import com.typeerror.myt.config.MytUserDetailsConfig;
import com.typeerror.myt.entities.Estudiante;
import com.typeerror.myt.entities.Materia;
import com.typeerror.myt.entities.RolUsuario;
import com.typeerror.myt.entities.TokenRecuperacion;
import com.typeerror.myt.entities.Tutor;
import com.typeerror.myt.entities.Usuario;
import com.typeerror.myt.repository.EstudianteRepository;
import com.typeerror.myt.repository.MateriaRepository;
import com.typeerror.myt.repository.TokenRecuperacionRepository;
import com.typeerror.myt.repository.TutorRepository;
import com.typeerror.myt.repository.UsuarioRepository;

import jakarta.servlet.http.Cookie;

class SecurityServicesUnitTest {

    private PasswordEncoder passwordEncoder;
    private MytUserDetailsConfig userDetailsConfig;
    private InMemoryUserDetailsManager inMemoryManager;
    private UsuarioRepository usuarioRepository;
    private EstudianteRepository estudianteRepository;
    private TutorRepository tutorRepository;
    private TokenRecuperacionRepository tokenRepository;
    private UserDetailsService userDetailsService;
    private LoginService loginService;

    @BeforeEach
    void preparar() {
        SecurityContextHolder.clearContext();
        passwordEncoder = new BCryptPasswordEncoder();
        userDetailsConfig = new MytUserDetailsConfig();
        inMemoryManager = userDetailsConfig.inMemoryUserDetailsManager(passwordEncoder);
        usuarioRepository = mock(UsuarioRepository.class);
        estudianteRepository = mock(EstudianteRepository.class);
        tutorRepository = mock(TutorRepository.class);
        tokenRepository = mock(TokenRecuperacionRepository.class);
        userDetailsService = userDetailsConfig.userDetailsService(usuarioRepository, inMemoryManager);
        loginService = new LoginService(
                usuarioRepository, estudianteRepository, tutorRepository,
                passwordEncoder, inMemoryManager);
    }

    @Test
    void configuraTresUsuariosEnMemoriaYRecuperaUsuariosDePostgreSqlConBcrypt() {
        UserDetails u1 = userDetailsService.loadUserByUsername("user1@myt.edu.co");
        UserDetails u2 = userDetailsService.loadUserByUsername("user2@myt.edu.co");
        UserDetails admin = userDetailsService.loadUserByUsername("admin@myt.edu.co");

        assertTrue(passwordEncoder.matches("1ManzanaGrande!", u1.getPassword()));
        assertTrue(passwordEncoder.matches("1ManzanaGrande!", u2.getPassword()));
        assertTrue(passwordEncoder.matches("1ManzanaGrande!", admin.getPassword()));

        assertTrue(autoridades(u1).contains("ROLE_USER"));
        assertTrue(autoridades(u2).contains("ROLE_USER"));
        assertTrue(autoridades(admin).contains("ROLE_ADMIN"));

        Usuario pgAdmin = new Usuario(99, "Admin", "PG", "pgadmin@myt.edu.co",
                passwordEncoder.encode("ClavePg123!"), null, true,
                new HashSet<>(Set.of(RolUsuario.ADMINISTRADOR)), null, null, null);
        when(usuarioRepository.findByCorreoIgnoreCase("pgadmin@myt.edu.co"))
                .thenReturn(Optional.of(pgAdmin));

        UserDetails cargadoPg = userDetailsService.loadUserByUsername("pgadmin@myt.edu.co");
        assertTrue(autoridades(cargadoPg).contains("ROLE_ADMIN"));
        assertTrue(autoridades(cargadoPg).contains("ROLE_ADMINISTRADOR"));

        assertThrows(UsernameNotFoundException.class,
                () -> userDetailsService.loadUserByUsername("inexistente@myt.edu.co"));
    }

    @Test
    void filtroJwtPueblaSecurityContextHolderConRolesUserYAdmin() throws Exception {
        JwtSesionService jwt = new JwtSesionService(
                "hXNYPluC5EuR7y/NA/VfoqKDbiMWUd5KrtTLa/hmDpA=",
                Duration.ofHours(8),
                false);
        SesionService sesionService = mock(SesionService.class);
        when(sesionService.resolver("ADMINISTRADOR:1"))
                .thenReturn(Optional.of(new ContextoSesion(
                        RolUsuario.ADMINISTRADOR, 1, "Admin MyT")));

        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(jwt, sesionService);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie(
                JwtSesionService.COOKIE,
                jwt.emitir(List.of("ADMINISTRADOR:1"), false)));
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        var auth = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(auth);
        assertTrue(auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch("ROLE_ADMIN"::equals));
        assertNotNull(request.getAttribute("apiSesion"));
    }

    @Test
    void flujoDeRecuperacionDeContrasenaYGoogleLogin() {
        Usuario u = new Usuario(10, "Sofía", "Estudiante", "user1@myt.edu.co",
                passwordEncoder.encode("1ManzanaGrande!"), null, true,
                new HashSet<>(Set.of(RolUsuario.ESTUDIANTE)), null, null, null);
        when(usuarioRepository.findByCorreoIgnoreCase("user1@myt.edu.co"))
                .thenReturn(Optional.of(u));
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(i -> i.getArgument(0));

        final TokenRecuperacion[] guardado = new TokenRecuperacion[1];
        when(tokenRepository.save(any(TokenRecuperacion.class))).thenAnswer(i -> {
            guardado[0] = i.getArgument(0);
            return guardado[0];
        });
        when(tokenRepository.findByToken(any())).thenAnswer(i -> Optional.ofNullable(guardado[0]));

        PasswordRecoveryService recoveryService = new PasswordRecoveryService(
                usuarioRepository, tokenRepository, loginService, passwordEncoder, inMemoryManager);

        var solicitud = recoveryService.solicitarRecuperacion("user1@myt.edu.co");
        assertTrue(solicitud.tokenRecuperacion().startsWith("MYT-"));

        recoveryService.restablecerContrasena(solicitud.tokenRecuperacion(), "NuevaClaveSegura2026!");
        assertTrue(passwordEncoder.matches("NuevaClaveSegura2026!", u.getContrasena()));
        assertTrue(guardado[0].getUsado());
        assertThrows(ResponseStatusException.class, () ->
                recoveryService.restablecerContrasena(
                        solicitud.tokenRecuperacion(), "OtraClaveSegura2026!"));

        // Google Auth
        when(estudianteRepository.save(any(Estudiante.class))).thenAnswer(i -> {
            Estudiante e = i.getArgument(0);
            e.setId(55);
            return e;
        });
        GoogleAuthService googleAuthService = new GoogleAuthService(
                usuarioRepository, estudianteRepository, loginService, passwordEncoder, true);

        String header = Base64.getUrlEncoder().withoutPadding()
                .encodeToString("{\"alg\":\"RS256\"}".getBytes(StandardCharsets.UTF_8));
        String payload = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(("{\"email\":\"nuevo.google@javeriana.edu.co\","
                        + "\"name\":\"Nuevo Google\"}").getBytes(StandardCharsets.UTF_8));
        var accesos = googleAuthService.autenticarConGoogle(
                null, null, header + "." + payload + ".sig");
        assertEquals(1, accesos.size());
        assertEquals(RolUsuario.ESTUDIANTE, accesos.getFirst().rol());
        verify(estudianteRepository).save(any(Estudiante.class));

        String emptyPayload = Base64.getUrlEncoder().withoutPadding()
                .encodeToString("{\"sub\":\"123\"}".getBytes(StandardCharsets.UTF_8));
        assertThrows(ResponseStatusException.class, () ->
                googleAuthService.autenticarConGoogle(
                        "admin@myt.edu.co", "Attacker", header + "." + emptyPayload + ".sig"));
    }

    @Test
    void endpointPublicoDevuelveEstadisticasSinAutenticacion() {
        TutorRepository tutores = mock(TutorRepository.class);
        MateriaRepository materias = mock(MateriaRepository.class);
        Usuario activo = new Usuario();
        activo.setActivo(true);
        Tutor t = new Tutor(1, activo, "Bio", Set.of(), null, true);
        when(tutores.findAll()).thenReturn(List.of(t));
        when(materias.findAll(any(Sort.class))).thenReturn(List.of(new Materia(1, "Cálculo")));

        PublicRestController controller = new PublicRestController(tutores, materias);
        var dto = controller.estadisticas();
        assertEquals("OPERATIVO", dto.estado());
        assertEquals(1L, dto.tutoresDisponibles());
        assertEquals(1L, dto.materiasActivas());
        assertFalse(dto.materias().isEmpty());
    }

    private Set<String> autoridades(UserDetails detalles) {
        return detalles.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(java.util.stream.Collectors.toSet());
    }
}
