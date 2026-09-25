package com.typeerror.myt.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import com.typeerror.myt.entities.RolUsuario;
import com.typeerror.myt.entities.Usuario;

public interface RegistroUsuarioService {

    Optional<Usuario> findById(Integer id);

    boolean puedeAsignarPerfil(Integer usuarioId);

    Set<RolUsuario> perfilesDisponibles(Integer usuarioId);

    void registrarEstudiante(Usuario usuario, String codigoEstudiantil, String universidad,
            String programaAcademico, Integer semestre);

    void registrarTutor(Usuario usuario, String biografia, List<String> materias,
            BigDecimal tarifaPorHora);

}
