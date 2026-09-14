package com.typeerror.myt.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.typeerror.myt.entities.Administrador;
import com.typeerror.myt.entities.Cliente;
import com.typeerror.myt.entities.Estudiante;
import com.typeerror.myt.entities.Tutor;
import com.typeerror.myt.repository.AdministradorRepository;
import com.typeerror.myt.repository.ClienteRepository;
import com.typeerror.myt.repository.EstudianteRepository;
import com.typeerror.myt.repository.TutorRepository;

class LoginServiceTest {

    private AdministradorRepository administradorRepository;
    private ClienteRepository clienteRepository;
    private EstudianteRepository estudianteRepository;
    private TutorRepository tutorRepository;
    private PasswordEncoder passwordEncoder;
    private LoginService loginService;

    @BeforeEach
    void configurar() {
        administradorRepository = mock(AdministradorRepository.class);
        clienteRepository = mock(ClienteRepository.class);
        estudianteRepository = mock(EstudianteRepository.class);
        tutorRepository = mock(TutorRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        loginService = new LoginService(administradorRepository, clienteRepository,
                estudianteRepository, tutorRepository, passwordEncoder);
    }

    @Test
    void autenticaAdministradorConPasswordEncoder() {
        Administrador administrador = new Administrador(7, "Ada", "Admin", "admin@myt.test",
                "hash-administrador", null, true);
        when(administradorRepository.findByCorreoIgnoreCase("admin@myt.test"))
                .thenReturn(Optional.of(administrador));
        when(passwordEncoder.matches("clave", "hash-administrador")).thenReturn(true);

        UsuarioAutenticado usuario = loginService.autenticar(" admin@myt.test ", "clave").orElseThrow();

        assertEquals(RolUsuario.ADMINISTRADOR, usuario.rol());
        assertEquals(7, usuario.perfilId());
        verify(passwordEncoder).matches("clave", "hash-administrador");
    }

    @Test
    void resuelveLosPerfilesDeEstudianteYTutor() {
        Cliente clienteEstudiante = cliente(11, "estudiante@myt.test", "hash-estudiante");
        Estudiante estudiante = new Estudiante(21, clienteEstudiante, "E-1", "Universidad", "Sistemas", 5);
        when(clienteRepository.findByCorreoIgnoreCase("estudiante@myt.test"))
                .thenReturn(Optional.of(clienteEstudiante));
        when(passwordEncoder.matches("clave-estudiante", "hash-estudiante")).thenReturn(true);
        when(estudianteRepository.findByClienteId(11)).thenReturn(Optional.of(estudiante));

        Cliente clienteTutor = cliente(12, "tutor@myt.test", "hash-tutor");
        Tutor tutor = new Tutor(22, clienteTutor, "Tutor", List.of("Cálculo"),
                new BigDecimal("40000"), 5.0, true);
        when(clienteRepository.findByCorreoIgnoreCase("tutor@myt.test"))
                .thenReturn(Optional.of(clienteTutor));
        when(passwordEncoder.matches("clave-tutor", "hash-tutor")).thenReturn(true);
        when(estudianteRepository.findByClienteId(12)).thenReturn(Optional.empty());
        when(tutorRepository.findByClienteId(12)).thenReturn(Optional.of(tutor));

        UsuarioAutenticado usuarioEstudiante = loginService
                .autenticar("estudiante@myt.test", "clave-estudiante").orElseThrow();
        UsuarioAutenticado usuarioTutor = loginService
                .autenticar("tutor@myt.test", "clave-tutor").orElseThrow();

        assertEquals(new UsuarioAutenticado(RolUsuario.ESTUDIANTE, 21), usuarioEstudiante);
        assertEquals(new UsuarioAutenticado(RolUsuario.TUTOR, 22), usuarioTutor);
    }

    @Test
    void rechazaUnaContrasenaIncorrecta() {
        Cliente cliente = cliente(13, "cliente@myt.test", "hash-guardado");
        when(clienteRepository.findByCorreoIgnoreCase("cliente@myt.test")).thenReturn(Optional.of(cliente));
        when(passwordEncoder.matches("incorrecta", "hash-guardado")).thenReturn(false);

        assertTrue(loginService.autenticar("cliente@myt.test", "incorrecta").isEmpty());
        verify(passwordEncoder).matches("incorrecta", "hash-guardado");
    }

    private Cliente cliente(Integer id, String correo, String hash) {
        return new Cliente(id, "Nombre", "Apellido", correo, hash, null, true);
    }
}
