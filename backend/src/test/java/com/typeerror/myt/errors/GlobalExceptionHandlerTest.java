package com.typeerror.myt.errors;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.ui.ConcurrentModel;

class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler handler;
    private ConcurrentModel model;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
        model = new ConcurrentModel();
    }

    @Test
    void handleTutorNotFoundException() {
        TutorNotFoundException ex = new TutorNotFoundException(5);
        String view = handler.handleTutorNotFoundException(ex, model);
        assertEquals("error", view);
        assertEquals("El tutor con ID 5 no fue encontrado.", model.getAttribute("errorMessage"));
    }

    @Test
    void handleConversacionNoExisteException() {
        ConversacionNoExisteException ex = new ConversacionNoExisteException(10);
        String view = handler.handleConversacionNoExisteException(ex, model);
        assertEquals("error", view);
        assertEquals("La conversación con ID 10 no existe.", model.getAttribute("errorMessage"));
    }

    @Test
    void handleEstudianteNotFoundException() {
        EstudianteNotFoundException ex = new EstudianteNotFoundException(3);
        String view = handler.handleEstudianteNotFoundException(ex, model);
        assertEquals("error", view);
        assertEquals("El estudiante con ID 3 no fue encontrado.", model.getAttribute("errorMessage"));
    }

    @Test
    void handleInformacionIncompletaException() {
        InformacionIncompletaException ex = new InformacionIncompletaException("Campo requerido");
        String view = handler.handleInformacionIncompletaException(ex, model);
        assertEquals("error", view);
        assertEquals("Campo requerido", model.getAttribute("errorMessage"));
    }

    @Test
    void handleInformacionNoValidaException() {
        InformacionNoValidaException ex = new InformacionNoValidaException("Dato invalido");
        String view = handler.handleInformacionNoValidaException(ex, model);
        assertEquals("error", view);
        assertEquals("Dato invalido", model.getAttribute("errorMessage"));
    }

    @Test
    void handleLongitudInadecuadaException() {
        LongitudInadecuadaException ex = new LongitudInadecuadaException("nombre", 3, 20);
        String view = handler.handleLongitudInadecuadaException(ex, model);
        assertEquals("error", view);
        assertEquals("El campo 'nombre' debe tener entre 3 y 20 caracteres.", model.getAttribute("errorMessage"));
    }

    @Test
    void handleMateriaNotFoundException() {
        MateriaNotFoundException ex = new MateriaNotFoundException(7);
        String view = handler.handleMateriaNotFoundException(ex, model);
        assertEquals("error", view);
        assertEquals("La materia con ID 7 no fue encontrada.", model.getAttribute("errorMessage"));
    }

    @Test
    void handleMensajeNoExisteException() {
        MensajeNoExisteException ex = new MensajeNoExisteException(99L);
        String view = handler.handleMensajeNoExisteException(ex, model);
        assertEquals("error", view);
        assertEquals("El mensaje con ID 99 no existe.", model.getAttribute("errorMessage"));
    }

    @Test
    void handleReservaNotFoundException() {
        ReservaNotFoundException ex = new ReservaNotFoundException(12);
        String view = handler.handleReservaNotFoundException(ex, model);
        assertEquals("error", view);
        assertEquals("La reserva con ID 12 no fue encontrada.", model.getAttribute("errorMessage"));
    }

    @Test
    void handleRolNotFoundException() {
        RolYaAsignadoException ex = new RolYaAsignadoException("ESTUDIANTE");
        String view = handler.handleRolNotFoundException(ex, model);
        assertEquals("error", view);
        String msg = "El rol ya había sido asignado al usuario previamente.";
        assertEquals(msg, model.getAttribute("errorMessage"));
    }

    @Test
    void handleSelfReservation() {
        SelfReservation ex = new SelfReservation();
        String view = handler.handleSelfReservation(ex, model);
        assertEquals("error", view);
        assertEquals("No puedes reservar tu propio espacio.", model.getAttribute("errorMessage"));
    }

    @Test
    void handleUsuarioDeRegistroNoExisteException() {
        UsuarioDeRegistroNoExisteException ex = new UsuarioDeRegistroNoExisteException();
        String view = handler.handleUsuarioDeRegistroNoExisteException(ex, model);
        assertEquals("error", view);
        String msg = "Debe existir un usuario válido para poder realizar el registro.";
        assertEquals(msg, model.getAttribute("errorMessage"));
    }

    @Test
    void handleUsuarioNoExisteException() {
        UsuarioNotFoundException ex = new UsuarioNotFoundException(1);
        String view = handler.handleUsuarioNoExisteException(ex, model);
        assertEquals("error", view);
        assertEquals("El usuario con ID 1 no fue encontrado.", model.getAttribute("errorMessage"));
    }

    @Test
    void handleUsuarioYaExistenteException() {
        UsuarioYaExistenteException ex = new UsuarioYaExistenteException("test@myt.com");
        String view = handler.handleUsuarioYaExistenteException(ex, model);
        assertEquals("error", view);
        assertEquals("El usuario con email test@myt.com ya existe.", model.getAttribute("errorMessage"));
    }
}
