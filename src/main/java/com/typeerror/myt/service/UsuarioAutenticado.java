package com.typeerror.myt.service;

import com.typeerror.myt.entities.RolUsuario;

public record UsuarioAutenticado(RolUsuario rol, Integer perfilId) {
}
