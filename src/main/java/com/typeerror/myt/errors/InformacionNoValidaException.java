package com.typeerror.myt.errors;

public class InformacionNoValidaException extends RuntimeException {
    public InformacionNoValidaException() {
        super("La información proporcionada no es válida.");
    }
}
