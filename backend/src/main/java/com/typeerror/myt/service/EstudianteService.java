package com.typeerror.myt.service;

import java.util.List;
import java.util.Optional;

import com.typeerror.myt.entities.Estudiante;

public interface EstudianteService {

    Optional<Estudiante> findById(Integer id);

    List<Estudiante> findAll();

}
