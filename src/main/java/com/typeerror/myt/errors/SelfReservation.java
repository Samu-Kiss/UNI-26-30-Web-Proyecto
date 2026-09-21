package com.typeerror.myt.errors;

public class SelfReservation extends   RuntimeException {
    public SelfReservation() {
        super("No puedes reservar tu propio espacio.");
    }
}
