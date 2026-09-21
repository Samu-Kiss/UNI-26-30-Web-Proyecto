package com.typeerror.myt.errors;

public class RolYaAsignadoException extends RuntimeException {
    public RolYaAsignadoException(String rol) {
        super("El rol ya había sido asignado al usuario previamente.");
    }
}
