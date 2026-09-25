package com.typeerror.myt.service;

import com.typeerror.myt.entities.RolUsuario;

/** Contexto temporal de navegación transportado en el parámetro de URL sesion. */
public record ContextoSesion(RolUsuario rol, Integer perfilId, String nombreUsuario) {

    public String valor() {
        return rol.name() + ":" + perfilId;
    }

    public String rutaMenu() {
        return switch (rol) {
            case ADMINISTRADOR -> "/admin";
            case ESTUDIANTE -> "/estudiante";
            case TUTOR -> "/tutor";
        };
    }

    public String rutaConSesion(String ruta) {
        return ruta + "?sesion=" + valor();
    }

    public static String redireccion(String ruta, String sesion) {
        return "redirect:" + ruta + "?sesion=" + sesion;
    }
}
