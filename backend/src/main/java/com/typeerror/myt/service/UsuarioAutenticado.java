package com.typeerror.myt.service;

import com.typeerror.myt.entities.RolUsuario;

public record UsuarioAutenticado(RolUsuario rol, Integer perfilId) {

    public String ruta() {
        String inicio = switch (rol) {
            case ADMINISTRADOR -> "/admin";
            case ESTUDIANTE -> "/estudiante";
            case TUTOR -> "/tutor";
        };
        return inicio + "?sesion=" + rol.name() + ":" + perfilId;
    }
}
