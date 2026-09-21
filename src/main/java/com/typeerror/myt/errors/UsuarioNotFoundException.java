package com.typeerror.myt.errors;

public class UsuarioNotFoundException extends RuntimeException {
    public UsuarioNotFoundException(Integer id)  {
        super("El usuario con ID " + id + " no fue encontrado.");
    }
}
