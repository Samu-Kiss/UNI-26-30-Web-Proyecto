package com.typeerror.myt.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.doThrow;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ui.ConcurrentModel;

import com.typeerror.myt.entities.Estudiante;
import com.typeerror.myt.entities.ModalidadReserva;
import com.typeerror.myt.entities.Tutor;
import com.typeerror.myt.errors.TutorNotFoundException;
import com.typeerror.myt.service.AdministradorService;
import com.typeerror.myt.service.DisponibilidadTutorService;
import com.typeerror.myt.service.EstudianteService;
import com.typeerror.myt.service.ReservaService;
import com.typeerror.myt.service.TutorService;
import com.typeerror.myt.entities.EstadoReserva;
import com.typeerror.myt.entities.Reserva;


@ExtendWith(MockitoExtension.class)
class ListingControllersTest {

    @Mock
    private AdministradorService administradorService;
    @Mock
    private EstudianteService estudianteService;
    @Mock
    private TutorService tutorService;
    @Mock
    private ReservaService reservaService;
    @Mock
    private DisponibilidadTutorService disponibilidadService;

    @Test
    void publicaTodosLosListados() {
        when(administradorService.findAll()).thenReturn(List.of());
        when(estudianteService.findAll()).thenReturn(List.of());
        when(tutorService.findAll()).thenReturn(List.of());
        when(reservaService.findAll()).thenReturn(List.of());
        ConcurrentModel model = new ConcurrentModel();

        assertEquals("administradores", new AdministradorController(administradorService)
                .listarAdministradores(model));
        assertTrue(model.containsAttribute("administradores"));
        assertEquals("estudiantes", new EstudianteController(estudianteService, reservaService)
                .listarEstudiantes(model));
        assertEquals("tutores", new TutorController(tutorService, reservaService).listarTutores(model));
        assertEquals("mostrar_reservas", new ReservaController(reservaService).listarReservas(model));
    }

    @Test
    void publicaLasReservasDelEstudiante() {
        Estudiante estudiante = mock(Estudiante.class);
        when(estudianteService.findById(7)).thenReturn(Optional.of(estudiante));
        when(reservaService.findByEstudianteId(7)).thenReturn(List.of());
        ConcurrentModel model = new ConcurrentModel();

        assertEquals("reservas-estudiante",
                new EstudianteController(estudianteService, reservaService)
                        .listarReservas(7, model));
        assertEquals(estudiante, model.getAttribute("estudiante"));
        assertTrue(model.containsAttribute("reservas"));
    }

    @Test
    void cambiaEstadoReservaYRedirecciona() {
        ConcurrentModel model = new ConcurrentModel();
        ReservaController controller = new ReservaController(reservaService);

        String resultado = controller.cambiarEstado(
                5,
                EstadoReserva.CONFIRMADA,
                null,
                "ADMINISTRADOR:7",
                model);

        assertEquals(
                "redirect:/reservas?sesion=ADMINISTRADOR:7",
                resultado);

        verify(reservaService).cambiarEstado(
                5,
                EstadoReserva.CONFIRMADA,
                null);
    }

    @Test
    void muestraErrorCuandoNoPuedeCambiarEstado() {
        doThrow(new IllegalArgumentException(
                "El motivo es obligatorio al cancelar o rechazar"))
                .when(reservaService)
                .cambiarEstado(
                        5,
                        EstadoReserva.CANCELADA,
                        null);

        when(reservaService.findAll()).thenReturn(List.of());

        ConcurrentModel model = new ConcurrentModel();
        ReservaController controller = new ReservaController(reservaService);

        String resultado = controller.cambiarEstado(
                5,
                EstadoReserva.CANCELADA,
                null,
                "ADMINISTRADOR:7",
                model);

        assertEquals("mostrar_reservas", resultado);

        assertEquals(
                "El motivo es obligatorio al cancelar o rechazar",
                model.getAttribute("error"));

        assertTrue(model.containsAttribute("reservas"));
    }

    @Test
    void tutorCambiaEstadoReservaYRedirecciona() {
        Tutor tutor = mock(Tutor.class);
        when(tutor.getId()).thenReturn(3);
        Reserva reserva = mock(Reserva.class);
        when(reserva.getTutor()).thenReturn(tutor);

        when(reservaService.findById(10)).thenReturn(Optional.of(reserva));

        ConcurrentModel model = new ConcurrentModel();
        TutorController controller = new TutorController(tutorService, reservaService);

        String resultado = controller.cambiarEstadoReserva(
                3,
                10,
                EstadoReserva.CONFIRMADA,
                null,
                "TUTOR:3",
                model);

        assertEquals("redirect:/tutores/3/reservas?sesion=TUTOR:3", resultado);
        verify(reservaService).cambiarEstado(10, EstadoReserva.CONFIRMADA, null);
    }

    @Test
    void tutorMuestraErrorCuandoReservaNoLePertenece() {
        Tutor tutor = mock(Tutor.class);
        when(tutor.getId()).thenReturn(99);
        Reserva reserva = mock(Reserva.class);
        when(reserva.getTutor()).thenReturn(tutor);

        when(reservaService.findById(10)).thenReturn(Optional.of(reserva));
        when(tutorService.findById(3)).thenReturn(Optional.empty());
        when(reservaService.findByTutorId(3)).thenReturn(List.of());

        ConcurrentModel model = new ConcurrentModel();
        TutorController controller = new TutorController(tutorService, reservaService);

        String resultado = controller.cambiarEstadoReserva(
                3,
                10,
                EstadoReserva.CONFIRMADA,
                null,
                "TUTOR:3",
                model);

        assertEquals("reservas-tutor", resultado);
        assertEquals("La reserva no pertenece a este tutor", model.getAttribute("error"));
        assertTrue(model.containsAttribute("reservas"));
    }

    @Test
    void tutorMuestraErrorCuandoNoOtorgaMotivo() {
        Tutor tutor = mock(Tutor.class);
        when(tutor.getId()).thenReturn(3);
        Reserva reserva = mock(Reserva.class);
        when(reserva.getTutor()).thenReturn(tutor);

        when(reservaService.findById(10)).thenReturn(Optional.of(reserva));
        doThrow(new IllegalArgumentException("El motivo es obligatorio al cancelar o rechazar"))
                .when(reservaService).cambiarEstado(10, EstadoReserva.RECHAZADA, null);

        when(tutorService.findById(3)).thenReturn(Optional.of(tutor));
        when(reservaService.findByTutorId(3)).thenReturn(List.of());

        ConcurrentModel model = new ConcurrentModel();
        TutorController controller = new TutorController(tutorService, reservaService);

        String resultado = controller.cambiarEstadoReserva(
                3,
                10,
                EstadoReserva.RECHAZADA,
                null,
                "TUTOR:3",
                model);

        assertEquals("reservas-tutor", resultado);
        assertEquals("El motivo es obligatorio al cancelar o rechazar", model.getAttribute("error"));
        assertEquals(tutor, model.getAttribute("tutor"));
        assertTrue(model.containsAttribute("reservas"));
    }

    @Test
    void publicaTutoresConCalificaciones() {
        Tutor tutorConCalificacion = mock(Tutor.class);
        Tutor tutorSinCalificacion = mock(Tutor.class);

        when(tutorConCalificacion.getId()).thenReturn(1);
        when(tutorSinCalificacion.getId()).thenReturn(2);

        when(tutorService.findAll())
                .thenReturn(List.of(tutorConCalificacion, tutorSinCalificacion));

        when(tutorService.findCalificacionPromedio(1))
                .thenReturn(Optional.of(4.5));

        when(tutorService.findCalificacionPromedio(2))
                .thenReturn(Optional.empty());

        ConcurrentModel model = new ConcurrentModel();
        TutorController controller =
                new TutorController(tutorService, reservaService);

        String resultado = controller.listarTutores(model);

        assertEquals("tutores", resultado);

        assertEquals(
                List.of(tutorConCalificacion, tutorSinCalificacion),
                model.getAttribute("tutores"));

        assertEquals(
                Map.of(
                        1, "4.5 / 5",
                        2, "Sin calificaciones"),
                model.getAttribute("calificaciones"));
    }

    @Test
    void abreFormularioReservaConTutorDisponible() {
        Tutor tutor = mock(Tutor.class);

        when(tutor.getDisponible()).thenReturn(true);
        when(tutorService.findById(5)).thenReturn(Optional.of(tutor));

        ConcurrentModel model = new ConcurrentModel();
        TutorController controller = new TutorController(tutorService, reservaService);

        String resultado = controller.mostrarFormularioReserva(5, model);

        assertEquals("reserva-form", resultado);
        assertEquals(tutor, model.getAttribute("tutor"));
    }

    @Test
    void rechazaFormularioSiTutorNoEstaDisponible() {
        Tutor tutor = mock(Tutor.class);

        when(tutor.getDisponible()).thenReturn(false);
        when(tutorService.findById(5)).thenReturn(Optional.of(tutor));

        ConcurrentModel model = new ConcurrentModel();
        TutorController controller = new TutorController(tutorService, reservaService);

        assertThrows(
                IllegalStateException.class,
                () -> controller.mostrarFormularioReserva(5, model));
    }

    @Test
    void rechazaFormularioSiTutorNoExiste() {
        when(tutorService.findById(5)).thenReturn(Optional.empty());

        ConcurrentModel model = new ConcurrentModel();
        TutorController controller =
                new TutorController(tutorService, reservaService);

        assertThrows(
                TutorNotFoundException.class,
                () -> controller.mostrarFormularioReserva(5, model));
    }

    @Test
    void procesarReservaGuardaReservaEnEstadoPendienteYRedirige() {
        TutorController controller = new TutorController(tutorService, reservaService,
                disponibilidadService);

        ConcurrentModel model = new ConcurrentModel();
        String vista = controller.procesarReserva(5, 1, LocalDate.now().plusDays(1),
                LocalTime.of(10, 0), 60, "Repaso Parcial",
                ModalidadReserva.PRESENCIAL,
                7, 7, "ESTUDIANTE:7", model);

        assertEquals("redirect:/estudiantes/7/reservas?sesion=ESTUDIANTE:7&reservaExitosa=true", vista);
    }

    @Test
    void procesarReservaManejaExcepcionYRegresaFormulario() {
        Tutor tutor = mock(Tutor.class);
        when(tutorService.findById(5)).thenReturn(Optional.of(tutor));
        when(reservaService.crearReserva(eq(5), eq(7), eq(1), any(), any(), eq(60), any(), any()))
                .thenThrow(new IllegalStateException("El tutor no está disponible"));

        TutorController controller = new TutorController(tutorService, reservaService,
                disponibilidadService);
        ConcurrentModel model = new ConcurrentModel();

        String vista = controller.procesarReserva(5, 1, LocalDate.now().plusDays(1),
                LocalTime.of(10, 0), 60, "Repaso Parcial",
                ModalidadReserva.PRESENCIAL,
                7, null, "ESTUDIANTE:7", model);

        assertEquals("reserva-form", vista);
        assertEquals("El tutor no está disponible", model.getAttribute("error"));
        assertEquals(tutor, model.getAttribute("tutor"));
    }

    @Test
    void procesarReservaRechazaFaltaDeEstudiante() {
        TutorController controller = new TutorController(tutorService, reservaService,
                disponibilidadService);
        ConcurrentModel model = new ConcurrentModel();

        assertThrows(IllegalArgumentException.class, () ->
                controller.procesarReserva(5, 1, LocalDate.now().plusDays(1),
                        LocalTime.of(10, 0), 60, "Repaso Parcial",
                        ModalidadReserva.PRESENCIAL,
                        null, null, "ESTUDIANTE:7", model));
    }

    @Test
    void listarReservasDelTutorExitoso() {
        Tutor tutor = mock(Tutor.class);
        when(tutorService.findById(5)).thenReturn(Optional.of(tutor));
        when(reservaService.findByTutorId(5)).thenReturn(List.of());

        TutorController controller = new TutorController(tutorService, reservaService);
        ConcurrentModel model = new ConcurrentModel();

        String vista = controller.listarReservasDelTutor(5, model);

        assertEquals("reservas-tutor", vista);
        assertEquals(tutor, model.getAttribute("tutor"));
        assertTrue(model.containsAttribute("reservas"));
    }

    @Test
    void listarReservasDelTutorFallaSiTutorNoExiste() {
        when(tutorService.findById(5)).thenReturn(Optional.empty());

        TutorController controller = new TutorController(tutorService, reservaService);
        ConcurrentModel model = new ConcurrentModel();

        assertThrows(TutorNotFoundException.class, () ->
                controller.listarReservasDelTutor(5, model));
    }

}
