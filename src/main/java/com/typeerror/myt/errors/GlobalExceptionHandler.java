package com.typeerror.myt.errors;

import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(TutorNotFoundException.class)
    public String handleTutorNotFoundException(
        TutorNotFoundException ex,
        Model model) {
        model.addAttribute("errorMessage", ex.getMessage());
        return "error";
    }

    @ExceptionHandler(ConversacionNoExisteException.class)
    public String handleConversacionNoExisteException(
        ConversacionNoExisteException ex,
        Model model) {
        model.addAttribute("errorMessage", ex.getMessage());
        return "error";
    }

    @ExceptionHandler(EstudianteNotFoundException.class)
    public String handleEstudianteNotFoundException(
        EstudianteNotFoundException ex,
        Model model) {
        model.addAttribute("errorMessage", ex.getMessage());
        return "error";
    }

    @ExceptionHandler(InformacionIncompletaException.class)
    public String handleInformacionIncompletaException(
        InformacionIncompletaException ex,
        Model model) {
        model.addAttribute("errorMessage", ex.getMessage());
        return "error";
    }

    @ExceptionHandler(InformacionNoValidaException.class)
    public String handleInformacionNoValidaException(
        InformacionNoValidaException ex,
        Model model) {
        model.addAttribute("errorMessage", ex.getMessage());
        return "error";
    }

    @ExceptionHandler(LongitudInadecuadaException.class)
    public String handleLongitudInadecuadaException(
        LongitudInadecuadaException ex,
        Model model) {
        model.addAttribute("errorMessage", ex.getMessage());
        return "error";
    }

    @ExceptionHandler(MateriaNotFoundException.class)
    public String handleMateriaNotFoundException(
        MateriaNotFoundException ex,
        Model model) {
        model.addAttribute("errorMessage", ex.getMessage());
        return "error";
    }

    @ExceptionHandler(MensajeNoExisteException.class)
    public String handleMensajeNoExisteException(
        MensajeNoExisteException ex,
        Model model) {
        model.addAttribute("errorMessage", ex.getMessage());
        return "error";
    }

    @ExceptionHandler(ReservaNotFoundException.class)
    public String handleReservaNotFoundException(
        ReservaNotFoundException ex,
        Model model) {
        model.addAttribute("errorMessage", ex.getMessage());
        return "error";
    }

    @ExceptionHandler(RolYaAsignadoException.class)
    public String handleRolNotFoundException(
        RolYaAsignadoException ex,
        Model model) {
        model.addAttribute("errorMessage", ex.getMessage());
        return "error";
    }

    @ExceptionHandler(SelfReservation.class)
    public String handleSelfReservation(
        SelfReservation ex,
        Model model) {
        model.addAttribute("errorMessage", ex.getMessage());
        return "error";
    }

    @ExceptionHandler(UsuarioDeRegistroNoExisteException.class)
    public String handleUsuarioDeRegistroNoExisteException(
        UsuarioDeRegistroNoExisteException ex,
        Model model) {
        model.addAttribute("errorMessage", ex.getMessage());
        return "error";
    }

    @ExceptionHandler(UsuarioNotFoundException.class)
    public String handleUsuarioNoExisteException(
        UsuarioNotFoundException ex,
        Model model) {
        model.addAttribute("errorMessage", ex.getMessage());
        return "error";
    }
    
    @ExceptionHandler(UsuarioYaExistenteException.class)
    public String handleUsuarioYaExistenteException(
        UsuarioYaExistenteException ex,
        Model model) {
        model.addAttribute("errorMessage", ex.getMessage());
        return "error";
    }
}
