package com.typeerror.myt.errors;

public class UsuarioYaExistenteException extends RuntimeException {
    public UsuarioYaExistenteException(String email) {
        super("El usuario con email " + email + " ya existe.");
    }
}
