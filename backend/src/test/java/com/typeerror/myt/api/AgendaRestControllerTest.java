package com.typeerror.myt.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import com.typeerror.myt.entities.BloqueoAgenda;
import com.typeerror.myt.entities.DiaSemana;
import com.typeerror.myt.entities.DisponibilidadTutor;
import com.typeerror.myt.entities.EstadoReserva;
import com.typeerror.myt.entities.Materia;
import com.typeerror.myt.entities.Reserva;
import com.typeerror.myt.entities.RolUsuario;
import com.typeerror.myt.entities.Tutor;
import com.typeerror.myt.entities.Usuario;
import com.typeerror.myt.repository.BloqueoAgendaRepository;
import com.typeerror.myt.repository.DisponibilidadTutorRepository;
import com.typeerror.myt.repository.MateriaRepository;
import com.typeerror.myt.repository.ReservaRepository;
import com.typeerror.myt.repository.TutorRepository;
import com.typeerror.myt.repository.UsuarioRepository;
import com.typeerror.myt.service.ContextoSesion;

class AgendaRestControllerTest {
    private final TutorRepository tutores = mock(TutorRepository.class);
    private final DisponibilidadTutorRepository horarios = mock(DisponibilidadTutorRepository.class);
    private final BloqueoAgendaRepository bloqueos = mock(BloqueoAgendaRepository.class);
    private final ReservaRepository reservas = mock(ReservaRepository.class);
    private final AgendaRestController controller = new AgendaRestController(tutores, horarios, bloqueos, reservas);
    private final LocalDate fecha = LocalDate.now().plusDays(7);
    private Tutor tutor;
    private DiaSemana dia;

    @BeforeEach
    void preparar() {
        Usuario usuario = new Usuario();
        usuario.setActivo(true);
        tutor = new Tutor();
        tutor.setId(7);
        tutor.setUsuario(usuario);
        tutor.setDisponible(true);
        dia = DiaSemana.values()[fecha.getDayOfWeek().getValue() - 1];
        when(tutores.findById(7)).thenReturn(Optional.of(tutor));
        when(tutores.bloquearPorId(7)).thenReturn(Optional.of(tutor));
        when(horarios.findByTutorId(7)).thenReturn(List.of(new DisponibilidadTutor(
                1, tutor, dia, LocalTime.of(9, 0), LocalTime.of(18, 0))));
    }

    @Test
    void ajustaUltimoInicioSegunDuracionYUsaMediasHoras() {
        assertEquals(LocalTime.of(17, 0), controller.horas(7, fecha, 60).getLast());
        assertEquals(LocalTime.of(16, 30), controller.horas(7, fecha, 90).getLast());
        assertEquals(LocalTime.of(16, 0), controller.horas(7, fecha, 120).getLast());
        assertTrue(controller.horas(7, fecha, 90).stream().allMatch(h -> h.getMinute() % 30 == 0));
        assertThrows(ResponseStatusException.class, () -> controller.horas(7, fecha, 45));
    }

    @Test
    void excluyeReservasBloqueosYDiasSinDisponibilidad() {
        Reserva r = new Reserva();
        r.setHoraInicio(LocalTime.of(10, 0));
        r.setDuracionMinutos(60);
        when(reservas.findByTutorIdAndFechaAndEstadoNotIn(any(), any(), any())).thenReturn(List.of(r));
        when(bloqueos.findByTutorId(7)).thenReturn(List.of(new BloqueoAgenda(null, tutor, fecha,
                LocalTime.of(12, 0), LocalTime.of(13, 0), "Ausente")));
        var horas = controller.horas(7, fecha, 60);
        assertFalse(horas.contains(LocalTime.of(9, 30)));
        assertFalse(horas.contains(LocalTime.of(10, 0)));
        assertFalse(horas.contains(LocalTime.of(11, 30)));
        assertTrue(horas.contains(LocalTime.of(11, 0)));
        assertTrue(controller.horas(7, fecha.plusDays(1), 60).isEmpty());
        when(horarios.findByTutorId(7)).thenReturn(List.of());
        assertTrue(controller.horas(7, fecha, 60).isEmpty());
    }

    @Test
    void noCambiaReservasActivasNiPermiteEditarAgendaAjena() {
        var vacia = new AgendaRestController.Agenda(List.of(), List.of());
        var ajeno = new ContextoSesion(RolUsuario.TUTOR, 8, "Otro tutor");
        assertThrows(ResponseStatusException.class, () -> controller.guardar(7, vacia, ajeno));
        Reserva r = new Reserva();
        r.setId(1);
        r.setEstado(EstadoReserva.CONFIRMADA);
        r.setFecha(fecha);
        r.setHoraInicio(LocalTime.of(10, 0));
        r.setDuracionMinutos(60);
        when(reservas.findByTutorIdOrderByFechaAscHoraInicioAsc(7)).thenReturn(List.of(r));
        var propio = new ContextoSesion(RolUsuario.TUTOR, 7, "Tutor");
        assertThrows(ResponseStatusException.class, () -> controller.guardar(7, vacia, propio));
        verify(horarios, never()).deleteAll(anyList());
        assertEquals(EstadoReserva.CONFIRMADA, r.getEstado());
    }

    @Test
    void actualizaMateriasDelTutorEnEdicion() {
        UsuarioRepository usuariosRepo = mock(UsuarioRepository.class);
        MateriaRepository materiasRepo = mock(MateriaRepository.class);
        TutorRestController tutorController = new TutorRestController(tutores, usuariosRepo, materiasRepo);

        tutor.getUsuario().setId(10);
        tutor.getUsuario().setNombre("Ana");
        tutor.getUsuario().setApellido("Tutor");
        Materia calculo = new Materia(1, "Cálculo");
        Materia fisica = new Materia(2, "Física");
        when(materiasRepo.findAllById(Set.of(1))).thenReturn(List.of(calculo));
        when(materiasRepo.findByNombre("Física")).thenReturn(Optional.empty());
        when(materiasRepo.save(any(Materia.class))).thenReturn(fisica);
        when(tutores.save(any(Tutor.class))).thenAnswer(inv -> inv.getArgument(0));

        var sesion = new ContextoSesion(RolUsuario.TUTOR, 7, "Ana");
        var edicion = new ApiDtos.TutorEdicion("Nueva bio", new BigDecimal("45000"), true,
                Set.of(1), List.of("Física"));
        var respuesta = tutorController.editar(7, edicion, sesion);

        assertEquals(200, respuesta.getStatusCode().value());
        assertEquals(2, respuesta.getBody().materias().size());
        assertEquals(Set.of(calculo, fisica), tutor.getMaterias());

        // Si se pasa lista de materias vacía se rechaza con 400
        var sinMaterias = new ApiDtos.TutorEdicion("Nueva bio", new BigDecimal("45000"), true,
                Set.of(), List.of("   "));
        assertThrows(ResponseStatusException.class, () -> tutorController.editar(7, sinMaterias, sesion));
    }
}
