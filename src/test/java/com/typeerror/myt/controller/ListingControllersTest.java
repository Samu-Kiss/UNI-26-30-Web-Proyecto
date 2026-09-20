package com.typeerror.myt.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.mock;
import static org.junit.jupiter.api.Assertions.assertThrows;


import java.util.List;
import java.util.Optional;
import java.util.Map;

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
import com.typeerror.myt.entities.Tutor;

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
                IllegalArgumentException.class,
                () -> controller.mostrarFormularioReserva(5, model));
    }
}
