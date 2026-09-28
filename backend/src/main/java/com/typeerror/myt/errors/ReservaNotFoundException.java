package com.typeerror.myt.errors;

public class ReservaNotFoundException extends RuntimeException {
    public ReservaNotFoundException(Integer id) {
        super("La reserva con ID " + id + " no fue encontrada.");
    }
}
