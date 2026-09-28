package com.typeerror.myt.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.typeerror.myt.entities.DiaSemana;
import com.typeerror.myt.entities.DisponibilidadTutor;
import com.typeerror.myt.entities.EstadoReserva;
import com.typeerror.myt.entities.Estudiante;
import com.typeerror.myt.entities.Resena;
import com.typeerror.myt.entities.Reserva;
import com.typeerror.myt.entities.RolUsuario;
import com.typeerror.myt.entities.Tutor;
import com.typeerror.myt.entities.Usuario;
import com.typeerror.myt.repository.DisponibilidadTutorRepository;
import com.typeerror.myt.repository.EstudianteRepository;
import com.typeerror.myt.repository.ResenaRepository;
import com.typeerror.myt.repository.TutorRepository;
import com.typeerror.myt.repository.UsuarioRepository;

@ExtendWith(MockitoExtension.class)
class DomainServicesTest {

    @Mock
    private DisponibilidadTutorRepository disponibilidadRepository;
    @Mock
    private ResenaRepository resenaRepository;
    @Mock
    private UsuarioRepository usuarioRepository;
    @Mock
    private EstudianteRepository estudianteRepository;
    @Mock
    private TutorRepository tutorRepository;

    @Test
    void guardaDisponibilidadValidaYRechazaIntervalosInvalidosOSolapados() {
        DisponibilidadTutorService servicio = new DisponibilidadTutorService(disponibilidadRepository);
        DisponibilidadTutor disponibilidad = disponibilidad(2, LocalTime.of(8, 0), LocalTime.of(10, 0));
        when(disponibilidadRepository.findByTutorIdAndDiaSemana(1, DiaSemana.LUNES))
                .thenReturn(List.of());
        when(disponibilidadRepository.save(disponibilidad)).thenReturn(disponibilidad);
        assertEquals(disponibilidad, servicio.guardar(disponibilidad));

        DisponibilidadTutor invalida = disponibilidad(null, LocalTime.of(10, 0), LocalTime.of(9, 0));
        assertThrows(IllegalArgumentException.class, () -> servicio.guardar(invalida));

        DisponibilidadTutor existente = disponibilidad(3, LocalTime.of(9, 0), LocalTime.of(11, 0));
        when(disponibilidadRepository.findByTutorIdAndDiaSemana(1, DiaSemana.LUNES))
                .thenReturn(List.of(existente));
        assertThrows(IllegalStateException.class, () -> servicio.guardar(disponibilidad));
    }

    @Test
    void guardaUnaResenaSoloParaReservaCompletadaYUnica() {
        ResenaService servicio = new ResenaService(resenaRepository);
        Reserva reserva = new Reserva();
        reserva.setId(1);
        reserva.setEstado(EstadoReserva.COMPLETADA);
        Resena resena = new Resena(null, reserva, 5, null, null);
        when(resenaRepository.findByReservaId(1)).thenReturn(Optional.empty());
        when(resenaRepository.save(resena)).thenReturn(resena);
        assertEquals(resena, servicio.guardar(resena));

        reserva.setEstado(EstadoReserva.PENDIENTE);
        assertThrows(IllegalStateException.class, () -> servicio.guardar(resena));
        reserva.setEstado(EstadoReserva.COMPLETADA);
        Resena existente = new Resena(2, reserva, 4, null, null);
        when(resenaRepository.findByReservaId(1)).thenReturn(Optional.of(existente));
        assertThrows(IllegalStateException.class, () -> servicio.guardar(resena));
    }

    @Test
    void consultaAdministradoresEstudiantesYTutores() {
        Usuario administrador = new Usuario();
        administrador.setRoles(Set.of(RolUsuario.ADMINISTRADOR));
        Usuario estudianteUsuario = new Usuario();
        estudianteUsuario.setRoles(Set.of(RolUsuario.ESTUDIANTE));
        when(usuarioRepository.findById(1)).thenReturn(Optional.of(administrador));
        when(usuarioRepository.findById(2)).thenReturn(Optional.of(estudianteUsuario));
        when(usuarioRepository
            .findDistinctByRolesContainingOrderByIdAsc(RolUsuario.ADMINISTRADOR))
            .thenReturn(List.of(administrador));
        AdministradorService administradores = new AdministradorServiceImpl(usuarioRepository);
        assertTrue(administradores.findById(1).isPresent());
        assertFalse(administradores.findById(2).isPresent());
        assertEquals(1, administradores.findAll().size());

        Estudiante estudiante = new Estudiante();
        Tutor tutor = new Tutor();
        when(estudianteRepository.findOneById(1)).thenReturn(Optional.of(estudiante));
        when(estudianteRepository.findAll()).thenReturn(List.of(estudiante));
        when(tutorRepository.findOneById(1)).thenReturn(Optional.of(tutor));
        when(tutorRepository.findAll()).thenReturn(List.of(tutor));
        when(tutorRepository.findCalificacionPromedioByTutorId(1))
        .thenReturn(Optional.of(4.5));
        EstudianteService estudiantes = new EstudianteServiceImpl(estudianteRepository);
        TutorService tutores = new TutorServiceImpl(tutorRepository);
        assertTrue(estudiantes.findById(1).isPresent());
        assertEquals(1, estudiantes.findAll().size());
        assertTrue(tutores.findById(1).isPresent());
        assertEquals(1, tutores.findAll().size());
        assertEquals(Optional.of(4.5), tutores.findCalificacionPromedio(1));
    }

    private DisponibilidadTutor disponibilidad(Integer id, LocalTime inicio, LocalTime fin) {
        Tutor tutor = new Tutor();
        tutor.setId(1);
        return new DisponibilidadTutor(id, tutor, DiaSemana.LUNES, inicio, fin);
    }
}
