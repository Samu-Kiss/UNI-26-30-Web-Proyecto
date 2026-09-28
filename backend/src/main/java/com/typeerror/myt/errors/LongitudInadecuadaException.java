package com.typeerror.myt.errors;

public class LongitudInadecuadaException extends RuntimeException {
    public LongitudInadecuadaException(String campo, int longitudMinima, int longitudMaxima) {
        super("El campo '" + campo + "' debe tener entre " + longitudMinima + " y " + longitudMaxima + " caracteres.");
    }
}
