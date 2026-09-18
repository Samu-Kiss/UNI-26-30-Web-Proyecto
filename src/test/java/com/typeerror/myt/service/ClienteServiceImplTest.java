package com.typeerror.myt.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import java.util.HashSet;
import java.util.stream.Collectors;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.typeerror.myt.entities.Usuario;
import com.typeerror.myt.entities.Materia;
import com.typeerror.myt.repository.MateriaRepository;
import com.typeerror.myt.entities.Estudiante;
import com.typeerror.myt.entities.Tutor;
import com.typeerror.myt.repository.UsuarioRepository;
import com.typeerror.myt.repository.EstudianteRepository;
import com.typeerror.myt.repository.TutorRepository;

class ClienteServiceImplTest {

    private UsuarioRepository clienteRepository;
    private EstudianteRepository estudianteRepository;
    private TutorRepository tutorRepository;
    private ClienteServiceImpl clienteService;

    @BeforeEach
    void configurar() {
        clienteRepository = mock(UsuarioRepository.class);
        estudianteRepository = mock(EstudianteRepository.class);
        tutorRepository = mock(TutorRepository.class);
        PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
        MateriaRepository materiaRepository = mock(MateriaRepository.class);
        when(materiaRepository.save(any())).thenAnswer(invocacion -> invocacion.getArgument(0));
        clienteService = new ClienteServiceImpl(clienteRepository, estudianteRepository,
                tutorRepository, passwordEncoder, materiaRepository);

        when(clienteRepository.findByCorreoIgnoreCase(any())).thenReturn(Optional.empty());
        when(passwordEncoder.encode(any())).thenReturn("hash-seguro");
        when(clienteRepository.save(any())).thenAnswer(invocacion -> {
            Usuario cliente = invocacion.getArgument(0);
            if (cliente.getId() == null) {
                cliente.setId(10);
            }
            return cliente;
        });
    }

    @Test
    void registraCuentaYPerfilDeEstudianteEnUnaOperacion() {
        Usuario cliente = cliente("estudiante-nuevo@myt.test");

        clienteService.registrarEstudiante(cliente, "EST-10", "Universidad", "Sistemas", 4);

        ArgumentCaptor<Estudiante> captor = ArgumentCaptor.forClass(Estudiante.class);
        verify(estudianteRepository).save(captor.capture());
        assertEquals(10, captor.getValue().getUsuario().getId());
        assertEquals("EST-10", captor.getValue().getCodigoEstudiantil());
        assertEquals("hash-seguro", cliente.getContrasena());
        assertTrue(cliente.getActivo());
    }

    @Test
    void registraCuentaYPerfilDeTutorEnUnaOperacion() {
        Usuario cliente = cliente("tutor-nuevo@myt.test");

        clienteService.registrarTutor(cliente, "Enseña matemáticas", List.of("Cálculo", "Álgebra"),
                new BigDecimal("50000"));

        ArgumentCaptor<Tutor> captor = ArgumentCaptor.forClass(Tutor.class);
        verify(tutorRepository).save(captor.capture());
        assertEquals(10, captor.getValue().getUsuario().getId());
        assertEquals(Set.of("Cálculo", "Álgebra"), captor.getValue().getMaterias().stream()
                .map(Materia::getNombre).collect(Collectors.toSet()));
        assertEquals(new BigDecimal("50000"), captor.getValue().getTarifaPorHora());
        assertEquals("hash-seguro", cliente.getContrasena());
    }

    @Test
    void permiteAsignarPerfilAUnaCuentaAntigua() {
        Usuario cliente = cliente("cuenta-antigua@myt.test");
        cliente.setId(15);
        cliente.setContrasena("");
        when(clienteRepository.findById(15)).thenReturn(Optional.of(new Usuario(15, "Anterior", "Usuario",
                cliente.getCorreo(), "hash-anterior", null, true, new HashSet<>(), null, null, null)));

        clienteService.registrarEstudiante(cliente, "ANT-15", "Universidad", "Derecho", 2);

        ArgumentCaptor<Estudiante> captor = ArgumentCaptor.forClass(Estudiante.class);
        verify(estudianteRepository).save(captor.capture());
        assertEquals(15, captor.getValue().getUsuario().getId());
        assertEquals("hash-anterior", captor.getValue().getUsuario().getContrasena());
    }

    @Test
    void detectaPerfilesDeEstudianteYDeTutor() {
        when(estudianteRepository.findByUsuarioId(15)).thenReturn(Optional.of(mock(Estudiante.class)));
        assertFalse(clienteService.puedeAsignarPerfil(15));

        when(estudianteRepository.findByUsuarioId(15)).thenReturn(Optional.empty());
        when(tutorRepository.findByUsuarioId(15)).thenReturn(Optional.of(mock(Tutor.class)));
        assertFalse(clienteService.puedeAsignarPerfil(15));

        when(tutorRepository.findByUsuarioId(15)).thenReturn(Optional.empty());
        assertTrue(clienteService.puedeAsignarPerfil(15));
    }

    @Test
    void rechazaDatosInvalidosDelPerfilDeEstudiante() {
        Usuario cliente = cliente("estudiante-invalido@myt.test");

        assertThrows(IllegalArgumentException.class,
                () -> clienteService.registrarEstudiante(cliente, null, "Universidad", "Sistemas", 4));
        assertThrows(IllegalArgumentException.class,
                () -> clienteService.registrarEstudiante(cliente, " ", "Universidad", "Sistemas", 4));
        assertThrows(IllegalArgumentException.class,
                () -> clienteService.registrarEstudiante(cliente, "EST-1", "Universidad", "Sistemas", null));
        assertThrows(IllegalArgumentException.class,
                () -> clienteService.registrarEstudiante(cliente, "EST-1", "Universidad", "Sistemas", 0));
        assertThrows(IllegalArgumentException.class,
                () -> clienteService.registrarEstudiante(cliente, "EST-1", "Universidad", "Sistemas", 31));
    }

    @Test
    void rechazaDatosInvalidosDelPerfilDeTutor() {
        Usuario cliente = cliente("tutor-invalido@myt.test");
        List<String> materias = List.of("Cálculo");

        assertThrows(IllegalArgumentException.class,
                () -> clienteService.registrarTutor(cliente, null, null, BigDecimal.ONE));
        assertThrows(IllegalArgumentException.class,
                () -> clienteService.registrarTutor(cliente, null, List.of(), BigDecimal.ONE));
        assertThrows(IllegalArgumentException.class,
                () -> clienteService.registrarTutor(cliente, null, materias, null));
        assertThrows(IllegalArgumentException.class,
                () -> clienteService.registrarTutor(cliente, null, materias, BigDecimal.ZERO));
    }

    @Test
    void normalizaLaBiografiaOpcionalDelTutor() {
        Usuario sinBiografia = cliente("tutor-sin-biografia@myt.test");
        clienteService.registrarTutor(sinBiografia, null, List.of("Cálculo"), BigDecimal.ONE);

        ArgumentCaptor<Tutor> captor = ArgumentCaptor.forClass(Tutor.class);
        verify(tutorRepository).save(captor.capture());
        assertNull(captor.getValue().getBiografia());
    }

    private Usuario cliente(String correo) {
        return new Usuario(null, "Nombre", "Apellido", correo, "clave-plana", null, true,
                new HashSet<>(), null, null, null);
    }
}
