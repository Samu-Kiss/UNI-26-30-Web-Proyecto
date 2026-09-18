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

class RegistroUsuarioServiceImplTest {

    private UsuarioRepository usuarioRepository;
    private EstudianteRepository estudianteRepository;
    private TutorRepository tutorRepository;
    private RegistroUsuarioServiceImpl usuarioService;

    @BeforeEach
    void configurar() {
        usuarioRepository = mock(UsuarioRepository.class);
        estudianteRepository = mock(EstudianteRepository.class);
        tutorRepository = mock(TutorRepository.class);
        PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
        MateriaRepository materiaRepository = mock(MateriaRepository.class);
        when(materiaRepository.save(any())).thenAnswer(invocacion -> invocacion.getArgument(0));
        usuarioService = new RegistroUsuarioServiceImpl(usuarioRepository, estudianteRepository,
                tutorRepository, passwordEncoder, materiaRepository);

        when(usuarioRepository.findByCorreoIgnoreCase(any())).thenReturn(Optional.empty());
        when(passwordEncoder.encode(any())).thenReturn("hash-seguro");
        when(usuarioRepository.save(any())).thenAnswer(invocacion -> {
            Usuario usuario = invocacion.getArgument(0);
            if (usuario.getId() == null) {
                usuario.setId(10);
            }
            return usuario;
        });
    }

    @Test
    void registraCuentaYPerfilDeEstudianteEnUnaOperacion() {
        Usuario usuario = usuario("estudiante-nuevo@myt.test");

        usuarioService.registrarEstudiante(usuario, "EST-10", "Universidad", "Sistemas", 4);

        ArgumentCaptor<Estudiante> captor = ArgumentCaptor.forClass(Estudiante.class);
        verify(estudianteRepository).save(captor.capture());
        assertEquals(10, captor.getValue().getUsuario().getId());
        assertEquals("EST-10", captor.getValue().getCodigoEstudiantil());
        assertEquals("hash-seguro", usuario.getContrasena());
        assertTrue(usuario.getActivo());
    }

    @Test
    void registraCuentaYPerfilDeTutorEnUnaOperacion() {
        Usuario usuario = usuario("tutor-nuevo@myt.test");

        usuarioService.registrarTutor(usuario, "Enseña matemáticas", List.of("Cálculo", "Álgebra"),
                new BigDecimal("50000"));

        ArgumentCaptor<Tutor> captor = ArgumentCaptor.forClass(Tutor.class);
        verify(tutorRepository).save(captor.capture());
        assertEquals(10, captor.getValue().getUsuario().getId());
        assertEquals(Set.of("Cálculo", "Álgebra"), captor.getValue().getMaterias().stream()
                .map(Materia::getNombre).collect(Collectors.toSet()));
        assertEquals(new BigDecimal("50000"), captor.getValue().getTarifaPorHora());
        assertEquals("hash-seguro", usuario.getContrasena());
    }

    @Test
    void permiteAsignarPerfilAUnaCuentaAntigua() {
        Usuario usuario = usuario("cuenta-antigua@myt.test");
        usuario.setId(15);
        usuario.setContrasena("");
        when(usuarioRepository.findById(15)).thenReturn(Optional.of(new Usuario(15, "Anterior", "Usuario",
                usuario.getCorreo(), "hash-anterior", null, true, new HashSet<>(), null, null, null)));

        usuarioService.registrarEstudiante(usuario, "ANT-15", "Universidad", "Derecho", 2);

        ArgumentCaptor<Estudiante> captor = ArgumentCaptor.forClass(Estudiante.class);
        verify(estudianteRepository).save(captor.capture());
        assertEquals(15, captor.getValue().getUsuario().getId());
        assertEquals("hash-anterior", captor.getValue().getUsuario().getContrasena());
    }

    @Test
    void detectaPerfilesDeEstudianteYDeTutor() {
        when(estudianteRepository.existsByUsuarioId(15)).thenReturn(true);
        assertTrue(usuarioService.puedeAsignarPerfil(15));
        assertEquals(Set.of(com.typeerror.myt.entities.RolUsuario.TUTOR),
                usuarioService.perfilesDisponibles(15));

        when(tutorRepository.existsByUsuarioId(15)).thenReturn(true);
        assertFalse(usuarioService.puedeAsignarPerfil(15));
    }

    @Test
    void rechazaDatosInvalidosDelPerfilDeEstudiante() {
        Usuario usuario = usuario("estudiante-invalido@myt.test");

        assertThrows(IllegalArgumentException.class,
                () -> usuarioService.registrarEstudiante(usuario, null, "Universidad", "Sistemas", 4));
        assertThrows(IllegalArgumentException.class,
                () -> usuarioService.registrarEstudiante(usuario, " ", "Universidad", "Sistemas", 4));
        assertThrows(IllegalArgumentException.class,
                () -> usuarioService.registrarEstudiante(usuario, "EST-1", "Universidad", "Sistemas", null));
        assertThrows(IllegalArgumentException.class,
                () -> usuarioService.registrarEstudiante(usuario, "EST-1", "Universidad", "Sistemas", 0));
        assertThrows(IllegalArgumentException.class,
                () -> usuarioService.registrarEstudiante(usuario, "EST-1", "Universidad", "Sistemas", 31));
    }

    @Test
    void rechazaDatosInvalidosDelPerfilDeTutor() {
        Usuario usuario = usuario("tutor-invalido@myt.test");
        List<String> materias = List.of("Cálculo");

        assertThrows(IllegalArgumentException.class,
                () -> usuarioService.registrarTutor(usuario, null, null, BigDecimal.ONE));
        assertThrows(IllegalArgumentException.class,
                () -> usuarioService.registrarTutor(usuario, null, List.of(), BigDecimal.ONE));
        assertThrows(IllegalArgumentException.class,
                () -> usuarioService.registrarTutor(usuario, null, materias, null));
        assertThrows(IllegalArgumentException.class,
                () -> usuarioService.registrarTutor(usuario, null, materias, BigDecimal.ZERO));
    }

    @Test
    void normalizaLaBiografiaOpcionalDelTutor() {
        Usuario sinBiografia = usuario("tutor-sin-biografia@myt.test");
        usuarioService.registrarTutor(sinBiografia, null, List.of("Cálculo"), BigDecimal.ONE);

        ArgumentCaptor<Tutor> captor = ArgumentCaptor.forClass(Tutor.class);
        verify(tutorRepository).save(captor.capture());
        assertNull(captor.getValue().getBiografia());
    }

    @Test
    void agregaElSegundoPerfilSinEliminarElPrimero() {
        Usuario existente = usuario("doble@myt.test");
        existente.setId(15);
        existente.getRoles().add(com.typeerror.myt.entities.RolUsuario.ESTUDIANTE);
        when(usuarioRepository.findById(15)).thenReturn(Optional.of(existente));

        usuarioService.registrarTutor(existente, null, List.of("Cálculo"), BigDecimal.ONE);

        assertEquals(Set.of(com.typeerror.myt.entities.RolUsuario.ESTUDIANTE,
                com.typeerror.myt.entities.RolUsuario.TUTOR), existente.getRoles());
        verify(usuarioRepository).save(existente);
        verify(tutorRepository).save(any(Tutor.class));
    }

    @Test
    void rechazaDuplicarUnPerfilDelMismoTipo() {
        Usuario existente = usuario("duplicado@myt.test");
        existente.setId(15);
        when(estudianteRepository.existsByUsuarioId(15)).thenReturn(true);

        assertThrows(IllegalArgumentException.class,
                () -> usuarioService.registrarEstudiante(
                        existente, "E-15", "Universidad", "Sistemas", 5));
    }

    private Usuario usuario(String correo) {
        return new Usuario(null, "Nombre", "Apellido", correo, "clave-plana", null, true,
                new HashSet<>(), null, null, null);
    }
}
