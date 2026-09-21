package com.typeerror.myt.errors;

public class InformacionIncompletaException extends RuntimeException {
    public InformacionIncompletaException() {
        super("Se ha intentado completar una operación sin rellenar un campo obligatorio y no puede estar vacío.");
    }
}
