package com.typeerror.myt.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.typeerror.myt.entities.EstadoReserva;
import com.typeerror.myt.entities.Estudiante;
import com.typeerror.myt.entities.Materia;
import com.typeerror.myt.entities.ModalidadReserva;
import com.typeerror.myt.entities.Reserva;
import com.typeerror.myt.entities.Tutor;
import com.typeerror.myt.entities.Usuario;
import com.typeerror.myt.repository.BloqueoAgendaRepository;
import com.typeerror.myt.repository.DisponibilidadTutorRepository;
import com.typeerror.myt.repository.ReservaRepository;

@ExtendWith(MockitoExtension.class)
class ReservaServiceImplTest {

    @Mock
    private ReservaRepository reservaRepository;
    @Mock
    private DisponibilidadTutorRepository disponibilidadRepository;
    @Mock
    private BloqueoAgendaRepository bloqueoRepository;

    private ReservaService servicio;

    @BeforeEach
    void preparar() {
        servicio = new ReservaServiceImpl(reservaRepository, disponibilidadRepository, bloqueoRepository);
    }

    @Test
    void guardaUnaReservaValidaSinSolapamientos() {
        Reserva reserva = reserva();
        when(disponibilidadRepository.findByTutorIdAndDiaSemana(any(), any())).thenReturn(List.of());
        when(bloqueoRepository.findByTutorIdAndFecha(any(), any())).thenReturn(List.of());
        when(reservaRepository.findByTutorIdAndFechaAndEstadoNotIn(any(), any(), any()))
                .thenReturn(List.of());
        when(reservaRepository.save(reserva)).thenReturn(reserva);

        assertEquals(reserva, servicio.guardar(reserva));
        assertEquals(LocalTime.of(10, 0), reserva.calcularHoraFin());
    }

    @Test
    void rechazaDatosInvalidosYReservaPropia() {
        Reserva sinMateria = reserva();
        sinMateria.setMateria(null);
        assertThrows(IllegalArgumentException.class, () -> servicio.guardar(sinMateria));

        Reserva propia = reserva();
        propia.getTutor().setUsuario(propia.getEstudiante().getUsuario());
        assertThrows(IllegalArgumentException.class, () -> servicio.guardar(propia));

        Reserva sinEnlace = reserva();
        sinEnlace.setUbicacionOEnlace(" ");
        assertThrows(IllegalArgumentException.class, () -> servicio.guardar(sinEnlace));
    }

    @Test
    void rechazaSolapamientos() {
        Reserva existente = reserva();
        existente.setId(8);
        Reserva nueva = reserva();
        nueva.setId(9);
        nueva.setHoraInicio(LocalTime.of(9, 30));
        when(disponibilidadRepository.findByTutorIdAndDiaSemana(any(), any())).thenReturn(List.of());
        when(bloqueoRepository.findByTutorIdAndFecha(any(), any())).thenReturn(List.of());
        when(reservaRepository.findByTutorIdAndFechaAndEstadoNotIn(any(), any(), any()))
                .thenReturn(List.of(existente));

        assertThrows(IllegalStateException.class, () -> servicio.guardar(nueva));
    }

    @Test
    void controlaTransicionesYCancelaciones() {
        Reserva reserva = reserva();
        reserva.setId(1);
        when(reservaRepository.findById(1)).thenReturn(Optional.of(reserva));
        when(reservaRepository.save(reserva)).thenReturn(reserva);

        Reserva cancelada = servicio.cambiarEstado(1, EstadoReserva.CANCELADA, "No puedo asistir");
        assertEquals(EstadoReserva.CANCELADA, cancelada.getEstado());
        assertNotNull(cancelada.getFechaCancelacion());

        assertThrows(IllegalStateException.class,
                () -> servicio.cambiarEstado(1, EstadoReserva.CONFIRMADA, null));
        when(reservaRepository.findById(99)).thenReturn(Optional.empty());
        assertThrows(IllegalArgumentException.class,
                () -> servicio.cambiarEstado(99, EstadoReserva.CANCELADA, "Motivo"));
    }

    @Test
    void exigeMotivoAlCancelar() {
        Reserva reserva = reserva();
        reserva.setId(1);
        when(reservaRepository.findById(1)).thenReturn(Optional.of(reserva));

        assertThrows(IllegalArgumentException.class,
                () -> servicio.cambiarEstado(1, EstadoReserva.CANCELADA, " "));
    }

    private Reserva reserva() {
        Usuario estudianteUsuario = usuario(1);
        Usuario tutorUsuario = usuario(2);
        Estudiante estudiante = new Estudiante();
        estudiante.setUsuario(estudianteUsuario);
        Tutor tutor = new Tutor();
        tutor.setId(3);
        tutor.setUsuario(tutorUsuario);

        Reserva reserva = new Reserva();
        reserva.setEstudiante(estudiante);
        reserva.setTutor(tutor);
        reserva.setMateria(new Materia(1, "Calculo"));
        reserva.setFecha(LocalDate.of(2026, 9, 21));
        reserva.setHoraInicio(LocalTime.of(9, 0));
        reserva.setDuracionMinutos(60);
        reserva.setTema("Limites");
        reserva.setModalidad(ModalidadReserva.VIRTUAL);
        reserva.setUbicacionOEnlace("https://meet.example.test/1");
        reserva.setEstado(EstadoReserva.PENDIENTE);
        reserva.setCostoTotal(BigDecimal.TEN);
        reserva.setMoneda("COP");
        return reserva;
    }

    private Usuario usuario(Integer id) {
        Usuario usuario = new Usuario();
        usuario.setId(id);
        return usuario;
    }
}
