package com.typeerror.myt.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
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

import com.typeerror.myt.entities.BloqueoAgenda;
import com.typeerror.myt.entities.DiaSemana;
import com.typeerror.myt.entities.DisponibilidadTutor;
import com.typeerror.myt.entities.EstadoReserva;
import com.typeerror.myt.entities.Estudiante;
import com.typeerror.myt.entities.Materia;
import com.typeerror.myt.entities.ModalidadReserva;
import com.typeerror.myt.entities.Reserva;
import com.typeerror.myt.entities.Tutor;
import com.typeerror.myt.entities.Usuario;
import com.typeerror.myt.errors.EstudianteNotFoundException;
import com.typeerror.myt.errors.InformacionNoValidaException;
import com.typeerror.myt.errors.MateriaNotFoundException;
import com.typeerror.myt.errors.ReservaNotFoundException;
import com.typeerror.myt.errors.SelfReservation;
import com.typeerror.myt.errors.TutorNotFoundException;
import com.typeerror.myt.repository.BloqueoAgendaRepository;
import com.typeerror.myt.repository.DisponibilidadTutorRepository;
import com.typeerror.myt.repository.EstudianteRepository;
import com.typeerror.myt.repository.MateriaRepository;
import com.typeerror.myt.repository.ReservaRepository;
import com.typeerror.myt.repository.TutorRepository;

@ExtendWith(MockitoExtension.class)
class ReservaServiceImplTest {

    @Mock
    private ReservaRepository reservaRepository;
    @Mock
    private TutorRepository tutorRepository;
    @Mock
    private EstudianteRepository estudianteRepository;
    @Mock
    private MateriaRepository materiaRepository;
    @Mock
    private DisponibilidadTutorRepository disponibilidadRepository;
    @Mock
    private BloqueoAgendaRepository bloqueoRepository;

    private ReservaService servicio;

    @BeforeEach
    void preparar() {
        servicio = new ReservaServiceImpl(reservaRepository, tutorRepository,
                estudianteRepository, materiaRepository,
                disponibilidadRepository, bloqueoRepository);
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
        Reserva sinEstudiante = reserva();
        sinEstudiante.setEstudiante(null);
        assertThrows(IllegalArgumentException.class, () -> servicio.guardar(sinEstudiante));

        Reserva sinTutor = reserva();
        sinTutor.setTutor(null);
        assertThrows(IllegalArgumentException.class, () -> servicio.guardar(sinTutor));

        Reserva sinMateria = reserva();
        sinMateria.setMateria(null);
        assertThrows(IllegalArgumentException.class, () -> servicio.guardar(sinMateria));

        Reserva sinFecha = reserva();
        sinFecha.setFecha(null);
        assertThrows(IllegalArgumentException.class, () -> servicio.guardar(sinFecha));

        Reserva sinHora = reserva();
        sinHora.setHoraInicio(null);
        assertThrows(IllegalArgumentException.class, () -> servicio.guardar(sinHora));

        Reserva sinDuracion = reserva();
        sinDuracion.setDuracionMinutos(null);
        assertThrows(IllegalArgumentException.class, () -> servicio.guardar(sinDuracion));

        Reserva duracionInvalida = reserva();
        duracionInvalida.setDuracionMinutos(0);
        assertThrows(IllegalArgumentException.class, () -> servicio.guardar(duracionInvalida));

        Reserva propia = reserva();
        propia.getTutor().setUsuario(propia.getEstudiante().getUsuario());
        assertThrows(SelfReservation.class, () -> servicio.guardar(propia));

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

        assertThrows(InformacionNoValidaException.class, () -> servicio.guardar(nueva));
    }

    @Test
    void rechazaFueraDeAgenda() {
        Reserva reserva = reserva();
        DisponibilidadTutor disp = new DisponibilidadTutor();
        disp.setDiaSemana(DiaSemana.LUNES);
        disp.setHoraInicio(LocalTime.of(14, 0));
        disp.setHoraFin(LocalTime.of(18, 0));

        when(disponibilidadRepository.findByTutorIdAndDiaSemana(any(), any()))
                .thenReturn(List.of(disp));

        assertThrows(InformacionNoValidaException.class, () -> servicio.guardar(reserva));
    }

    @Test
    void rechazaHorarioBloqueado() {
        Reserva reserva = reserva();
        BloqueoAgenda bloqueo = new BloqueoAgenda();
        bloqueo.setHoraInicio(LocalTime.of(8, 30));
        bloqueo.setHoraFin(LocalTime.of(9, 30));

        when(disponibilidadRepository.findByTutorIdAndDiaSemana(any(), any()))
                .thenReturn(List.of());
        when(bloqueoRepository.findByTutorIdAndFecha(any(), any()))
                .thenReturn(List.of(bloqueo));

        assertThrows(InformacionNoValidaException.class, () -> servicio.guardar(reserva));
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
        assertThrows(ReservaNotFoundException.class,
                () -> servicio.cambiarEstado(99, EstadoReserva.CANCELADA, "Motivo"));
    }

    @Test
    void permiteRechazarConMotivo() {
        Reserva reserva = reserva();
        reserva.setId(1);
        when(reservaRepository.findById(1)).thenReturn(Optional.of(reserva));
        when(reservaRepository.save(reserva)).thenReturn(reserva);

        Reserva rechazada = servicio.cambiarEstado(1, EstadoReserva.RECHAZADA, "Conflicto de horario");
        assertEquals(EstadoReserva.RECHAZADA, rechazada.getEstado());
        assertEquals("Conflicto de horario", rechazada.getMotivoCancelacion());
    }

    @Test
    void exigeMotivoAlCancelar() {
        Reserva reserva = reserva();
        reserva.setId(1);
        when(reservaRepository.findById(1)).thenReturn(Optional.of(reserva));

        assertThrows(IllegalArgumentException.class,
                () -> servicio.cambiarEstado(1, EstadoReserva.CANCELADA, " "));
    }

    @Test
    void rechazaMotivoConMasDe500Caracteres() {
        Reserva reserva = reserva();
        reserva.setId(1);

        when(reservaRepository.findById(1))
                .thenReturn(Optional.of(reserva));

        String motivoLargo = "a".repeat(501);

        assertThrows(
                IllegalArgumentException.class,
                () -> servicio.cambiarEstado(
                        1,
                        EstadoReserva.CANCELADA,
                        motivoLargo));
    }

    @Test
    void crearReservaVirtualExitosamente() {
        Tutor tutor = tutorConTarifa(3, new BigDecimal("60000"), true);
        Estudiante estudiante = estudiante(1);
        Materia materia = new Materia(10, "Física");

        when(tutorRepository.findOneById(3)).thenReturn(Optional.of(tutor));
        when(estudianteRepository.findOneById(1)).thenReturn(Optional.of(estudiante));
        when(materiaRepository.findById(10)).thenReturn(Optional.of(materia));
        when(disponibilidadRepository.findByTutorIdAndDiaSemana(any(), any())).thenReturn(List.of());
        when(bloqueoRepository.findByTutorIdAndFecha(any(), any())).thenReturn(List.of());
        when(reservaRepository.findByTutorIdAndFechaAndEstadoNotIn(any(), any(), any())).thenReturn(List.of());
        when(reservaRepository.save(any(Reserva.class))).thenAnswer(i -> i.getArgument(0));

        Reserva creada = servicio.crearReserva(3, 1, 10,
                LocalDate.of(2026, 9, 21), LocalTime.of(10, 0), 90,
                "Leyes de Newton", ModalidadReserva.VIRTUAL);

        assertNotNull(creada);
        assertEquals(tutor, creada.getTutor());
        assertEquals(estudiante, creada.getEstudiante());
        assertEquals(materia, creada.getMateria());
        assertEquals(ModalidadReserva.VIRTUAL, creada.getModalidad());
        assertEquals("https://meet.google.com/myt-tutoria", creada.getUbicacionOEnlace());
        assertEquals(new BigDecimal("90000.00"), creada.getCostoTotal());
        assertEquals(EstadoReserva.PENDIENTE, creada.getEstado());
    }

    @Test
    void crearReservaPresencialExitosamente() {
        Tutor tutor = tutorConTarifa(3, new BigDecimal("40000"), true);
        Estudiante estudiante = estudiante(1);
        Materia materia = new Materia(10, "Química");

        when(tutorRepository.findOneById(3)).thenReturn(Optional.of(tutor));
        when(estudianteRepository.findOneById(1)).thenReturn(Optional.of(estudiante));
        when(materiaRepository.findById(10)).thenReturn(Optional.of(materia));
        when(disponibilidadRepository.findByTutorIdAndDiaSemana(any(), any())).thenReturn(List.of());
        when(bloqueoRepository.findByTutorIdAndFecha(any(), any())).thenReturn(List.of());
        when(reservaRepository.findByTutorIdAndFechaAndEstadoNotIn(any(), any(), any())).thenReturn(List.of());
        when(reservaRepository.save(any(Reserva.class))).thenAnswer(i -> i.getArgument(0));

        Reserva creada = servicio.crearReserva(3, 1, 10,
                LocalDate.of(2026, 9, 21), LocalTime.of(10, 0), 60,
                "Estequiometría", ModalidadReserva.PRESENCIAL);

        assertNotNull(creada);
        assertEquals("Campus Universitario / Aula del Tutor", creada.getUbicacionOEnlace());
        assertEquals(new BigDecimal("40000.00"), creada.getCostoTotal());
    }

    @Test
    void crearReservaFallaSiTutorNoExiste() {
        when(tutorRepository.findOneById(3)).thenReturn(Optional.empty());

        assertThrows(TutorNotFoundException.class, () ->
                servicio.crearReserva(3, 1, 10,
                        LocalDate.of(2026, 9, 21), LocalTime.of(10, 0), 60,
                        "Tema", ModalidadReserva.PRESENCIAL));
    }

    @Test
    void crearReservaFallaSiTutorNoDisponible() {
        Tutor tutorNoDisponible = tutorConTarifa(3, new BigDecimal("40000"), false);
        when(tutorRepository.findOneById(3)).thenReturn(Optional.of(tutorNoDisponible));

        assertThrows(IllegalStateException.class, () ->
                servicio.crearReserva(3, 1, 10,
                        LocalDate.of(2026, 9, 21), LocalTime.of(10, 0), 60,
                        "Tema", ModalidadReserva.PRESENCIAL));
    }

    @Test
    void crearReservaFallaSiEstudianteNoExiste() {
        Tutor tutor = tutorConTarifa(3, new BigDecimal("40000"), true);
        when(tutorRepository.findOneById(3)).thenReturn(Optional.of(tutor));
        when(estudianteRepository.findOneById(1)).thenReturn(Optional.empty());

        assertThrows(EstudianteNotFoundException.class, () ->
                servicio.crearReserva(3, 1, 10,
                        LocalDate.of(2026, 9, 21), LocalTime.of(10, 0), 60,
                        "Tema", ModalidadReserva.PRESENCIAL));
    }

    @Test
    void crearReservaFallaSiMateriaNoExiste() {
        Tutor tutor = tutorConTarifa(3, new BigDecimal("40000"), true);
        Estudiante estudiante = estudiante(1);
        when(tutorRepository.findOneById(3)).thenReturn(Optional.of(tutor));
        when(estudianteRepository.findOneById(1)).thenReturn(Optional.of(estudiante));
        when(materiaRepository.findById(10)).thenReturn(Optional.empty());

        assertThrows(MateriaNotFoundException.class, () ->
                servicio.crearReserva(3, 1, 10,
                        LocalDate.of(2026, 9, 21), LocalTime.of(10, 0), 60,
                        "Tema", ModalidadReserva.PRESENCIAL));
    }

    @Test
    void consultaMetodosBusquedaReserva() {
        Reserva r = reserva();
        when(reservaRepository.findOneById(1)).thenReturn(Optional.of(r));
        when(reservaRepository.findAll()).thenReturn(List.of(r));
        when(reservaRepository.findByTutorIdOrderByFechaAscHoraInicioAsc(3)).thenReturn(List.of(r));
        when(reservaRepository.findByEstudianteIdOrderByFechaAscHoraInicioAsc(1)).thenReturn(List.of(r));

        assertTrue(servicio.findById(1).isPresent());
        assertEquals(1, servicio.findAll().size());
        assertEquals(1, servicio.findByTutorId(3).size());
        assertEquals(1, servicio.findByEstudianteId(1).size());

        verify(reservaRepository).findOneById(1);
        verify(reservaRepository).findAll();
        verify(reservaRepository).findByTutorIdOrderByFechaAscHoraInicioAsc(3);
        verify(reservaRepository).findByEstudianteIdOrderByFechaAscHoraInicioAsc(1);
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

    private Tutor tutorConTarifa(Integer id, BigDecimal tarifa, boolean disponible) {
        Tutor tutor = new Tutor();
        tutor.setId(id);
        tutor.setTarifaPorHora(tarifa);
        tutor.setDisponible(disponible);
        tutor.setUsuario(usuario(id + 10));
        return tutor;
    }

    private Estudiante estudiante(Integer id) {
        Estudiante est = new Estudiante();
        est.setId(id);
        est.setUsuario(usuario(id));
        return est;
    }

    private Usuario usuario(Integer id) {
        Usuario usuario = new Usuario();
        usuario.setId(id);
        return usuario;
    }


}
