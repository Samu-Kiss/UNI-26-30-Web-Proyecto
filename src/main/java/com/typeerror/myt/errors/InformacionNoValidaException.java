package com.typeerror.myt.errors;

public class InformacionNoValidaException extends IllegalArgumentException {
    public InformacionNoValidaException() {
        super("La información proporcionada no es válida.");
    }

    public InformacionNoValidaException(String message) {
        super(message);
    }
}

