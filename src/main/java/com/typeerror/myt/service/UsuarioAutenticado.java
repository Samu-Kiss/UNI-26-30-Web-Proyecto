package com.typeerror.myt.service;

import com.typeerror.myt.entities.RolUsuario;

public record UsuarioAutenticado(RolUsuario rol, Integer perfilId) {

    public String ruta() {
        return switch (rol) {
            case ADMINISTRADOR -> "/admin";
            case ESTUDIANTE -> "/tutores";
            case TUTOR -> "/tutores/" + perfilId + "/reservas";
        };
    }
}
