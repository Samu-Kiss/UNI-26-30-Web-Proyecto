package com.typeerror.myt.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ui.ConcurrentModel;

import com.typeerror.myt.service.AdministradorService;
import com.typeerror.myt.service.EstudianteService;
import com.typeerror.myt.service.ReservaService;
import com.typeerror.myt.service.TutorService;

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
    void publicaTodosLosListadosYLaRedireccionHistorica() {
        when(administradorService.findAll()).thenReturn(List.of());
        when(estudianteService.findAll()).thenReturn(List.of());
        when(tutorService.findAll()).thenReturn(List.of());
        when(reservaService.findAll()).thenReturn(List.of());
        ConcurrentModel model = new ConcurrentModel();

        assertEquals("administradores", new AdministradorController(administradorService)
                .listarAdministradores(model));
        assertTrue(model.containsAttribute("administradores"));
        assertEquals("estudiantes", new EstudianteController(estudianteService).listarEstudiantes(model));
        assertEquals("tutores", new TutorController(tutorService).listarTutores(model));
        assertEquals("mostrar_reservas", new ReservaController(reservaService).listarReservas(model));
        assertEquals("redirect:/usuarios", new ClienteRedirectController().redirigirAUsuarios());
    }
}
