package com.typeerror.myt.errors;

public class MensajeNoExisteException extends RuntimeException {
    public MensajeNoExisteException(Long id) {
        super("El mensaje con ID " + id + " no existe.");
    }
}
