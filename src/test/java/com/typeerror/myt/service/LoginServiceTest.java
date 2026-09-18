package com.typeerror.myt.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import java.util.HashSet;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.typeerror.myt.entities.RolUsuario;
import com.typeerror.myt.entities.Usuario;
import com.typeerror.myt.entities.Estudiante;
import com.typeerror.myt.entities.Tutor;
import com.typeerror.myt.repository.UsuarioRepository;
import com.typeerror.myt.repository.EstudianteRepository;
import com.typeerror.myt.repository.TutorRepository;

class LoginServiceTest {

    private UsuarioRepository clienteRepository;
    private EstudianteRepository estudianteRepository;
    private TutorRepository tutorRepository;
    private PasswordEncoder passwordEncoder;
    private LoginService loginService;

    @BeforeEach
    void configurar() {
        clienteRepository = mock(UsuarioRepository.class);
        estudianteRepository = mock(EstudianteRepository.class);
        tutorRepository = mock(TutorRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        loginService = new LoginService(clienteRepository,
                estudianteRepository, tutorRepository, passwordEncoder);
    }

    @Test
    void autenticaAdministradorConPasswordEncoder() {
        Usuario administrador = new Usuario(7, "Ada", "Admin", "admin@myt.test",
                "hash-administrador", null, true, new HashSet<>(Set.of(RolUsuario.ADMINISTRADOR)), null, null, null);
        when(clienteRepository.findByCorreoIgnoreCase("admin@myt.test"))
                .thenReturn(Optional.of(administrador));
        when(passwordEncoder.matches("clave", "hash-administrador")).thenReturn(true);

        UsuarioAutenticado usuario = loginService.autenticar(" admin@myt.test ", "clave").getFirst();

        assertEquals(RolUsuario.ADMINISTRADOR, usuario.rol());
        assertEquals(7, usuario.perfilId());
        verify(passwordEncoder).matches("clave", "hash-administrador");
    }

    @Test
    void resuelveLosPerfilesDeEstudianteYTutor() {
        Usuario clienteEstudiante = cliente(11, "estudiante@myt.test", "hash-estudiante");
        Estudiante estudiante = new Estudiante(21, clienteEstudiante, "E-1", "Universidad", "Sistemas", 5);
        when(clienteRepository.findByCorreoIgnoreCase("estudiante@myt.test"))
                .thenReturn(Optional.of(clienteEstudiante));
        when(passwordEncoder.matches("clave-estudiante", "hash-estudiante")).thenReturn(true);
        when(estudianteRepository.findByUsuarioId(11)).thenReturn(Optional.of(estudiante));

        Usuario clienteTutor = cliente(12, "tutor@myt.test", "hash-tutor");
        Tutor tutor = new Tutor(22, clienteTutor, "Tutor", Set.of(),
                new BigDecimal("40000"), true);
        when(clienteRepository.findByCorreoIgnoreCase("tutor@myt.test"))
                .thenReturn(Optional.of(clienteTutor));
        when(passwordEncoder.matches("clave-tutor", "hash-tutor")).thenReturn(true);
        when(estudianteRepository.findByUsuarioId(12)).thenReturn(Optional.empty());
        when(tutorRepository.findByUsuarioId(12)).thenReturn(Optional.of(tutor));

        UsuarioAutenticado usuarioEstudiante = loginService
                .autenticar("estudiante@myt.test", "clave-estudiante").getFirst();
        UsuarioAutenticado usuarioTutor = loginService
                .autenticar("tutor@myt.test", "clave-tutor").getFirst();

        assertEquals(new UsuarioAutenticado(RolUsuario.ESTUDIANTE, 21), usuarioEstudiante);
        assertEquals(new UsuarioAutenticado(RolUsuario.TUTOR, 22), usuarioTutor);
    }

    @Test
    void rechazaUnaContrasenaIncorrecta() {
        Usuario cliente = cliente(13, "cliente@myt.test", "hash-guardado");
        when(clienteRepository.findByCorreoIgnoreCase("cliente@myt.test")).thenReturn(Optional.of(cliente));
        when(passwordEncoder.matches("incorrecta", "hash-guardado")).thenReturn(false);

        assertTrue(loginService.autenticar("cliente@myt.test", "incorrecta").isEmpty());
        verify(passwordEncoder).matches("incorrecta", "hash-guardado");
    }

    @Test
    void conservaTodosLosDestinosDeUnaCuentaConVariosRoles() {
        Usuario usuario = cliente(20, "multi@myt.test", "hash-multi");
        usuario.getRoles().add(RolUsuario.ADMINISTRADOR);
        Estudiante estudiante = new Estudiante(30, usuario, "M-1", "Universidad", "Sistemas", 5);
        Tutor tutor = new Tutor(40, usuario, "Tutor", Set.of(), BigDecimal.ONE, true);
        when(clienteRepository.findByCorreoIgnoreCase("multi@myt.test")).thenReturn(Optional.of(usuario));
        when(passwordEncoder.matches("clave", "hash-multi")).thenReturn(true);
        when(estudianteRepository.findByUsuarioId(20)).thenReturn(Optional.of(estudiante));
        when(tutorRepository.findByUsuarioId(20)).thenReturn(Optional.of(tutor));

        assertEquals(List.of(
                new UsuarioAutenticado(RolUsuario.ADMINISTRADOR, 20),
                new UsuarioAutenticado(RolUsuario.ESTUDIANTE, 30),
                new UsuarioAutenticado(RolUsuario.TUTOR, 40)),
                loginService.autenticar("multi@myt.test", "clave"));
    }

    private Usuario cliente(Integer id, String correo, String hash) {
        return new Usuario(id, "Nombre", "Apellido", correo, hash, null, true,
                new HashSet<>(Set.of(RolUsuario.ESTUDIANTE, RolUsuario.TUTOR)), null, null, null);
    }
}
