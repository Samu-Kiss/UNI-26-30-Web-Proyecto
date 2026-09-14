package com.typeerror.myt.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import com.typeerror.myt.entities.Cliente;

public interface ClienteService {

    Optional<Cliente> findById(Integer id);

    List<Cliente> findAll();

    boolean puedeAsignarPerfil(Integer clienteId);

    void guardar(Cliente cliente);

    void registrarEstudiante(Cliente cliente, String codigoEstudiantil, String universidad,
            String programaAcademico, Integer semestre);

    void registrarTutor(Cliente cliente, String biografia, List<String> materias,
            BigDecimal tarifaPorHora);

    void desactivar(Integer id);

    void activar(Integer id);

}
