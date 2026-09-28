package com.typeerror.myt.errors;

public class UsuarioDeRegistroNoExisteException  extends RuntimeException {
    public UsuarioDeRegistroNoExisteException() {
        super("Debe existir un usuario válido para poder realizar el registro.");
    }
}
