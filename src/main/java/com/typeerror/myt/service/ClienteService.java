package com.typeerror.myt.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import com.typeerror.myt.entities.Usuario;

public interface ClienteService {

    Optional<Usuario> findById(Integer id);

    List<Usuario> findAll();

    boolean puedeAsignarPerfil(Integer clienteId);

    void guardar(Usuario cliente);

    void registrarEstudiante(Usuario cliente, String codigoEstudiantil, String universidad,
            String programaAcademico, Integer semestre);

    void registrarTutor(Usuario cliente, String biografia, List<String> materias,
            BigDecimal tarifaPorHora);

    void desactivar(Integer id);

    void activar(Integer id);

}
