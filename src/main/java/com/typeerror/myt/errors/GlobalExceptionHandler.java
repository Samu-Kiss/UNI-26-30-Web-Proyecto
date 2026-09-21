package com.typeerror.myt.errors;

import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class GlobalExceptionHandler {

    private static final String ERROR_MESSAGE_ATTR = "errorMessage";
    private static final String ERROR_VIEW = "error";

    @ExceptionHandler(TutorNotFoundException.class)
    public String handleTutorNotFoundException(
        TutorNotFoundException ex,
        Model model) {
        model.addAttribute(ERROR_MESSAGE_ATTR, ex.getMessage());
        return ERROR_VIEW;
    }

    @ExceptionHandler(ConversacionNoExisteException.class)
    public String handleConversacionNoExisteException(
        ConversacionNoExisteException ex,
        Model model) {
        model.addAttribute(ERROR_MESSAGE_ATTR, ex.getMessage());
        return ERROR_VIEW;
    }

    @ExceptionHandler(EstudianteNotFoundException.class)
    public String handleEstudianteNotFoundException(
        EstudianteNotFoundException ex,
        Model model) {
        model.addAttribute(ERROR_MESSAGE_ATTR, ex.getMessage());
        return ERROR_VIEW;
    }

    @ExceptionHandler(InformacionIncompletaException.class)
    public String handleInformacionIncompletaException(
        InformacionIncompletaException ex,
        Model model) {
        model.addAttribute(ERROR_MESSAGE_ATTR, ex.getMessage());
        return ERROR_VIEW;
    }

    @ExceptionHandler(InformacionNoValidaException.class)
    public String handleInformacionNoValidaException(
        InformacionNoValidaException ex,
        Model model) {
        model.addAttribute(ERROR_MESSAGE_ATTR, ex.getMessage());
        return ERROR_VIEW;
    }

    @ExceptionHandler(LongitudInadecuadaException.class)
    public String handleLongitudInadecuadaException(
        LongitudInadecuadaException ex,
        Model model) {
        model.addAttribute(ERROR_MESSAGE_ATTR, ex.getMessage());
        return ERROR_VIEW;
    }

    @ExceptionHandler(MateriaNotFoundException.class)
    public String handleMateriaNotFoundException(
        MateriaNotFoundException ex,
        Model model) {
        model.addAttribute(ERROR_MESSAGE_ATTR, ex.getMessage());
        return ERROR_VIEW;
    }

    @ExceptionHandler(MensajeNoExisteException.class)
    public String handleMensajeNoExisteException(
        MensajeNoExisteException ex,
        Model model) {
        model.addAttribute(ERROR_MESSAGE_ATTR, ex.getMessage());
        return ERROR_VIEW;
    }

    @ExceptionHandler(ReservaNotFoundException.class)
    public String handleReservaNotFoundException(
        ReservaNotFoundException ex,
        Model model) {
        model.addAttribute(ERROR_MESSAGE_ATTR, ex.getMessage());
        return ERROR_VIEW;
    }

    @ExceptionHandler(RolYaAsignadoException.class)
    public String handleRolNotFoundException(
        RolYaAsignadoException ex,
        Model model) {
        model.addAttribute(ERROR_MESSAGE_ATTR, ex.getMessage());
        return ERROR_VIEW;
    }

    @ExceptionHandler(SelfReservation.class)
    public String handleSelfReservation(
        SelfReservation ex,
        Model model) {
        model.addAttribute(ERROR_MESSAGE_ATTR, ex.getMessage());
        return ERROR_VIEW;
    }

    @ExceptionHandler(UsuarioDeRegistroNoExisteException.class)
    public String handleUsuarioDeRegistroNoExisteException(
        UsuarioDeRegistroNoExisteException ex,
        Model model) {
        model.addAttribute(ERROR_MESSAGE_ATTR, ex.getMessage());
        return ERROR_VIEW;
    }

    @ExceptionHandler(UsuarioNotFoundException.class)
    public String handleUsuarioNoExisteException(
        UsuarioNotFoundException ex,
        Model model) {
        model.addAttribute(ERROR_MESSAGE_ATTR, ex.getMessage());
        return ERROR_VIEW;
    }

    @ExceptionHandler(UsuarioYaExistenteException.class)
    public String handleUsuarioYaExistenteException(
        UsuarioYaExistenteException ex,
        Model model) {
        model.addAttribute(ERROR_MESSAGE_ATTR, ex.getMessage());
        return ERROR_VIEW;
    }
}
