package com.typeerror.myt.errors;

public class ConversacionNoExisteException extends RuntimeException {
    public ConversacionNoExisteException(Integer id) {
        super("La conversación con ID " + id + " no existe.");
    }
}
