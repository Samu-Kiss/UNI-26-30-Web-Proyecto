package com.typeerror.myt.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.doThrow;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ui.ConcurrentModel;

import com.typeerror.myt.service.AdministradorService;
import com.typeerror.myt.service.EstudianteService;
import com.typeerror.myt.service.ReservaService;
import com.typeerror.myt.service.TutorService;
import com.typeerror.myt.entities.Estudiante;
import com.typeerror.myt.entities.EstadoReserva;


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
}
