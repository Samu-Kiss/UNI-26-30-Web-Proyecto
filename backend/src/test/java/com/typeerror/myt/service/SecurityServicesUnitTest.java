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
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
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

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.ECDSASigner;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.Curve;
import com.nimbusds.jose.jwk.ECKey;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.ECKeyGenerator;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.typeerror.myt.api.PerfilRestController;
import com.typeerror.myt.api.PublicRestController;
import com.typeerror.myt.api.SesionRestController;
import com.typeerror.myt.api.UsuarioRestController;
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
    void flujoDeRecuperacionDeContrasenaYGoogleLogin() throws Exception {
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

        GoogleAuthService supabaseGoogleAuth = new GoogleAuthService(
                usuarioRepository, estudianteRepository, loginService, passwordEncoder,
                false, "", "", "postgres.iozaniwbftbrslqzqfxk");
        assertEquals("https://iozaniwbftbrslqzqfxk.supabase.co",
                supabaseGoogleAuth.resolverSupabaseUrl());
        assertTrue(supabaseGoogleAuth.construirUrlAutorizacionGoogle("http://localhost:4200/login")
                .startsWith("https://iozaniwbftbrslqzqfxk.supabase.co/auth/v1/authorize?provider=google"));

        String supabasePayload = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(("{\"sub\":\"d0c8e8a0-1234\",\"email\":\"supabase.user@javeriana.edu.co\","
                        + "\"user_metadata\":{\"full_name\":\"Laura Supabase\"}}")
                        .getBytes(StandardCharsets.UTF_8));
        var accesosSupabase = supabaseGoogleAuth.autenticarConGoogle(
                null, null, header + "." + supabasePayload + ".sig");
        assertEquals(1, accesosSupabase.size());

        String expiredPayload = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(("{\"email\":\"exp@javeriana.edu.co\",\"exp\":1000}")
                        .getBytes(StandardCharsets.UTF_8));
        assertThrows(ResponseStatusException.class, () ->
                supabaseGoogleAuth.autenticarConGoogle(
                        null, null, header + "." + expiredPayload + ".sig"));

        String invalidIssuerPayload = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(("{\"iss\":\"https://evil.example.com/auth/v1\","
                        + "\"email\":\"attacker@javeriana.edu.co\"}")
                        .getBytes(StandardCharsets.UTF_8));
        assertThrows(ResponseStatusException.class, () ->
                supabaseGoogleAuth.autenticarConGoogle(
                        null, null, header + "." + invalidIssuerPayload + ".sig"));

        ECKey ecJwk = new ECKeyGenerator(Curve.P_256)
                .keyID("supabase-es256-kid")
                .generate();
        supabaseGoogleAuth.establecerJwkSet(new JWKSet(ecJwk.toPublicJWK()));

        SignedJWT validSignedJwt = new SignedJWT(
                new JWSHeader.Builder(JWSAlgorithm.ES256).keyID("supabase-es256-kid").build(),
                new JWTClaimsSet.Builder()
                        .issuer("https://iozaniwbftbrslqzqfxk.supabase.co/auth/v1")
                        .subject("es256-sub-01")
                        .expirationTime(Date.from(Instant.now().plusSeconds(3600)))
                        .claim("email", "es256.supabase@javeriana.edu.co")
                        .claim("user_metadata", Map.of("full_name", "Valeria ES256"))
                        .build());
        validSignedJwt.sign(new ECDSASigner(ecJwk));
        var accesosEs256 = supabaseGoogleAuth.autenticarConGoogle(
                null, null, validSignedJwt.serialize());
        assertEquals(1, accesosEs256.size());

        // Usuario existente con nombre placeholder ("Camila Google") se sincroniza con el nombre real del JWT
        Usuario placeholderUser = new Usuario();
        placeholderUser.setId(55);
        placeholderUser.setNombre("Camila");
        placeholderUser.setApellido("Google");
        placeholderUser.setCorreo("sammy.pico.duran@gmail.com");
        placeholderUser.setActivo(true);
        placeholderUser.setRoles(new HashSet<>(Set.of(RolUsuario.ESTUDIANTE)));
        when(usuarioRepository.findByCorreoIgnoreCase("sammy.pico.duran@gmail.com"))
                .thenReturn(Optional.of(placeholderUser));
        when(estudianteRepository.findByUsuarioId(55))
                .thenReturn(Optional.of(new Estudiante(21, placeholderUser, "GOOGLE-55", "Javeriana", "Ing", 1)));

        SignedJWT samuelJwt = new SignedJWT(
                new JWSHeader.Builder(JWSAlgorithm.ES256).keyID("supabase-es256-kid").build(),
                new JWTClaimsSet.Builder()
                        .issuer("https://iozaniwbftbrslqzqfxk.supabase.co/auth/v1")
                        .subject("23757e99-7f9f-43ae-85f2-261b0ba8c085")
                        .expirationTime(Date.from(Instant.now().plusSeconds(3600)))
                        .claim("email", "sammy.pico.duran@gmail.com")
                        .claim("user_metadata", Map.of("full_name", "Samuel Pico", "name", "Samuel Pico"))
                        .build());
        samuelJwt.sign(new ECDSASigner(ecJwk));
        var accesosSamuel = supabaseGoogleAuth.autenticarConGoogle(
                null, null, samuelJwt.serialize());
        assertEquals(1, accesosSamuel.size());
        assertEquals("Samuel", placeholderUser.getNombre());
        assertEquals("Pico", placeholderUser.getApellido());

        ECKey wrongKey = new ECKeyGenerator(Curve.P_256)
                .keyID("supabase-es256-kid")
                .generate();
        SignedJWT forgedJwt = new SignedJWT(
                new JWSHeader.Builder(JWSAlgorithm.ES256).keyID("supabase-es256-kid").build(),
                new JWTClaimsSet.Builder()
                        .issuer("https://iozaniwbftbrslqzqfxk.supabase.co/auth/v1")
                        .claim("email", "forged@javeriana.edu.co")
                        .build());
        forgedJwt.sign(new ECDSASigner(wrongKey));
        assertThrows(ResponseStatusException.class, () ->
                supabaseGoogleAuth.autenticarConGoogle(
                        null, null, forgedJwt.serialize()));
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

    @Test
    void cubreRamasAdicionalesDeGoogleAuthYRecuperacion() throws Exception {
        assertEquals("https://custom.supabase.co",
                GoogleAuthService.determinarSupabaseUrl("https://custom.supabase.co///", ""));
        assertEquals("https://rrxvxcufuwmjbqiwhgmt.supabase.co",
                GoogleAuthService.determinarSupabaseUrl("", ""));

        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(i -> {
            Usuario u = i.getArgument(0);
            if (u.getId() == null) {
                u.setId(77);
            }
            return u;
        });
        when(estudianteRepository.save(any(Estudiante.class))).thenAnswer(i -> {
            Estudiante e = i.getArgument(0);
            e.setId(88);
            return e;
        });

        GoogleAuthService demoAuth = new GoogleAuthService(
                usuarioRepository, estudianteRepository, loginService, passwordEncoder,
                true, "http://127.0.0.1:1///", "anon-key-test", "");
        assertTrue(demoAuth.construirUrlAutorizacionGoogle("").contains("redirect_to="));

        // Correo inválido en modo demo -> 400
        assertThrows(ResponseStatusException.class,
                () -> demoAuth.autenticarConGoogle("correo-invalido", "Nombre", ""));

        // Alias de correo compuesto y simple sin nombre explícito
        var accAlias = demoAuth.autenticarConGoogle("ana.maria@javeriana.edu.co", null, "");
        assertEquals(1, accAlias.size());
        var accSimple = demoAuth.autenticarConGoogle("pedro@javeriana.edu.co", "   ", "");
        assertEquals(1, accSimple.size());
        var accUnNombre = demoAuth.autenticarConGoogle("carlos@javeriana.edu.co", "Carlos", "");
        assertEquals(1, accUnNombre.size());

        // Usuario existente inactivo -> 403
        Usuario inactivo = new Usuario(30, "Inactivo", "User", "inactivo@javeriana.edu.co",
                "hash", null, false, new HashSet<>(Set.of(RolUsuario.ESTUDIANTE)), null, null, null);
        when(usuarioRepository.findByCorreoIgnoreCase("inactivo@javeriana.edu.co"))
                .thenReturn(Optional.of(inactivo));
        assertThrows(ResponseStatusException.class,
                () -> demoAuth.autenticarConGoogle("inactivo@javeriana.edu.co", "Inactivo", ""));

        // Usuario existente activo sin perfiles creados -> le asigna ESTUDIANTE y crea entidad
        Usuario sinPerfil = new Usuario(31, "Sin", "Perfil", "sinperfil@javeriana.edu.co",
                "hash", null, true, new HashSet<>(), null, null, null);
        when(usuarioRepository.findByCorreoIgnoreCase("sinperfil@javeriana.edu.co"))
                .thenReturn(Optional.of(sinPerfil));
        var accSinPerfil = demoAuth.autenticarConGoogle("sinperfil@javeriana.edu.co", "Sin Perfil", "");
        assertEquals(1, accSinPerfil.size());
        assertTrue(sinPerfil.getRoles().contains(RolUsuario.ESTUDIANTE));

        // Firma RSA (RS256) y metadatos con given_name / family_name / raw_user_meta_data
        RSAKey rsaJwk = new RSAKeyGenerator(2048).keyID("rsa-kid-01").generate();
        demoAuth.establecerJwkSet(new JWKSet(rsaJwk.toPublicJWK()));
        SignedJWT rsaJwt = new SignedJWT(
                new JWSHeader.Builder(JWSAlgorithm.RS256).keyID("rsa-kid-01").build(),
                new JWTClaimsSet.Builder()
                        .issuer("https://accounts.google.com/")
                        .expirationTime(Date.from(Instant.now().plusSeconds(3600)))
                        .claim("raw_user_meta_data", Map.of(
                                "email", "rsa.user@javeriana.edu.co",
                                "given_name", "Lucía",
                                "family_name", "Gómez"))
                        .build());
        rsaJwt.sign(new RSASSASigner(rsaJwk));
        var accRsa = demoAuth.autenticarConGoogle(null, null, rsaJwt.serialize());
        assertEquals(1, accRsa.size());

        // Kid desconocido intenta cargar JWKS remoto y falla con 401
        SignedJWT unknownKidJwt = new SignedJWT(
                new JWSHeader.Builder(JWSAlgorithm.RS256).keyID("kid-inexistente").build(),
                new JWTClaimsSet.Builder()
                        .issuer("accounts.google.com")
                        .claim("email", "kid@javeriana.edu.co")
                        .claim("full_name", "Kid Test")
                        .build());
        unknownKidJwt.sign(new RSASSASigner(rsaJwk));
        assertThrows(ResponseStatusException.class,
                () -> demoAuth.autenticarConGoogle(null, null, unknownKidJwt.serialize()));

        // Tokens malformados y modo no-demo sin credencial
        assertThrows(ResponseStatusException.class,
                () -> demoAuth.autenticarConGoogle(null, null, "token.incompleto"));
        assertThrows(ResponseStatusException.class,
                () -> demoAuth.autenticarConGoogle(null, null, "a.@@@.c"));
        GoogleAuthService prodAuth = new GoogleAuthService(
                usuarioRepository, estudianteRepository, loginService, passwordEncoder, false);
        assertThrows(ResponseStatusException.class,
                () -> prodAuth.autenticarConGoogle("a@b.com", "A", ""));

        // TokenRecuperacion PrePersist y validaciones de PasswordRecoveryService
        TokenRecuperacion tr = new TokenRecuperacion();
        tr.setUsado(null);
        var m = TokenRecuperacion.class.getDeclaredMethod("prepararCreacion");
        m.setAccessible(true);
        m.invoke(tr);
        assertFalse(tr.getUsado());
        assertNotNull(tr.getFechaCreacion());

        PasswordRecoveryService recoveryService = new PasswordRecoveryService(
                usuarioRepository, tokenRepository, loginService, passwordEncoder, inMemoryManager);
        assertThrows(ResponseStatusException.class, () -> recoveryService.solicitarRecuperacion("  "));
        assertThrows(ResponseStatusException.class,
                () -> recoveryService.solicitarRecuperacion("inactivo@javeriana.edu.co"));
        assertThrows(ResponseStatusException.class,
                () -> recoveryService.restablecerContrasena("  ", "ClaveValida123!"));
        assertThrows(ResponseStatusException.class,
                () -> recoveryService.restablecerContrasena("MYT-123", "corta"));
    }

    @Test
    void cubreControladoresRestDeUsuariosSesionYPerfil() throws Exception {
        RegistroUsuarioService registroService = mock(RegistroUsuarioService.class);
        UsuarioService usuarioService = mock(UsuarioService.class);
        UsuarioRestController usuarioCtrl = new UsuarioRestController(
                usuarioRepository, registroService, usuarioService);

        Usuario base = new Usuario(1, "Ana", "López", "ana@myt.edu.co", "hash", "3001234567",
                true, new HashSet<>(Set.of(RolUsuario.ESTUDIANTE)), null, null, null);
        when(usuarioRepository.findById(1)).thenReturn(Optional.of(base));
        when(usuarioRepository.findById(99)).thenReturn(Optional.empty());
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(i -> i.getArgument(0));

        assertEquals(200, usuarioCtrl.consultar(1).getStatusCode().value());
        assertEquals(404, usuarioCtrl.consultar(99).getStatusCode().value());

        var edicion = new UsuarioRestController.EdicionUsuario(
                "Ana María", "López", "ana@myt.edu.co", "3001234567");
        assertEquals(200, usuarioCtrl.actualizar(1, edicion).getStatusCode().value());
        assertEquals(404, usuarioCtrl.actualizar(99, edicion).getStatusCode().value());

        assertEquals(204, usuarioCtrl.cambiarEstado(
                1, new UsuarioRestController.EstadoUsuarioDto(true)).getStatusCode().value());
        verify(usuarioService).activar(1);
        assertEquals(204, usuarioCtrl.cambiarEstado(
                1, new UsuarioRestController.EstadoUsuarioDto(false)).getStatusCode().value());
        verify(usuarioService).desactivar(1);

        when(usuarioRepository.existsById(99)).thenReturn(false);
        assertEquals(404, usuarioCtrl.eliminar(99).getStatusCode().value());
        when(usuarioRepository.existsById(1)).thenReturn(true);
        assertEquals(204, usuarioCtrl.eliminar(1).getStatusCode().value());

        var perfilAlta = new UsuarioRestController.PerfilAlta();
        perfilAlta.setRol("ESTUDIANTE");
        assertEquals(404, usuarioCtrl.agregarPerfil(99, perfilAlta).getStatusCode().value());
        assertEquals(201, usuarioCtrl.agregarPerfil(1, perfilAlta).getStatusCode().value());
        perfilAlta.setRol("TUTOR");
        perfilAlta.setMaterias("Cálculo, Física");
        assertEquals(201, usuarioCtrl.agregarPerfil(1, perfilAlta).getStatusCode().value());
        perfilAlta.setRol("ADMINISTRADOR");
        assertEquals(201, usuarioCtrl.agregarPerfil(1, perfilAlta).getStatusCode().value());
        perfilAlta.setRol("DESCONOCIDO");
        assertEquals(400, usuarioCtrl.agregarPerfil(1, perfilAlta).getStatusCode().value());

        // SesionRestController sin servicios opcionales -> 503
        JwtSesionService jwt = new JwtSesionService(
                "hXNYPluC5EuR7y/NA/VfoqKDbiMWUd5KrtTLa/hmDpA=", Duration.ofHours(8), false);
        SesionService sesionService = mock(SesionService.class);
        SesionRestController sesionCtrlSinOpcionales = new SesionRestController(jwt, loginService, sesionService);
        MockHttpServletResponse resp = new MockHttpServletResponse();
        assertThrows(ResponseStatusException.class, () -> sesionCtrlSinOpcionales.urlGoogle(null));
        assertThrows(ResponseStatusException.class, () -> sesionCtrlSinOpcionales.redirigirGoogle(null, resp));
        assertThrows(ResponseStatusException.class, () -> sesionCtrlSinOpcionales.loginGoogle(
                new SesionRestController.CredencialesGoogle("a@b.c", "A", "tok"), resp));
        assertThrows(ResponseStatusException.class, () -> sesionCtrlSinOpcionales.solicitarRecuperacion(
                new SesionRestController.SolicitudRecuperacion("a@b.c")));
        assertThrows(ResponseStatusException.class, () -> sesionCtrlSinOpcionales.restablecerContrasena(
                new SesionRestController.RestablecerContrasena("tok", "Clave12345!")));

        // PerfilRestController para ADMINISTRADOR, TUTOR y ESTUDIANTE
        Tutor tutor = new Tutor(2, base, "Bio", Set.of(), null, true);
        Estudiante est = new Estudiante(3, base, "COD", "Uni", "Prog", 1);
        when(tutorRepository.findById(2)).thenReturn(Optional.of(tutor));
        when(estudianteRepository.findOneById(3)).thenReturn(Optional.of(est));
        PerfilRestController perfilCtrl = new PerfilRestController(
                usuarioRepository, tutorRepository, estudianteRepository);
        assertEquals("Ana María", perfilCtrl.consultar(
                new ContextoSesion(RolUsuario.ADMINISTRADOR, 1, "Ana")).nombre());
        assertEquals("Ana María", perfilCtrl.consultar(
                new ContextoSesion(RolUsuario.TUTOR, 2, "Ana")).nombre());
        assertEquals("Ana María", perfilCtrl.guardar(
                new ContextoSesion(RolUsuario.ESTUDIANTE, 3, "Ana"), edicion).nombre());
    }

    private Set<String> autoridades(UserDetails detalles) {
        return detalles.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(java.util.stream.Collectors.toSet());
    }
}
