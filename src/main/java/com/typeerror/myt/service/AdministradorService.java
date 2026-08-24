package com.typeerror.myt.service;

import java.util.List;
import java.util.Optional;

import com.typeerror.myt.entities.Administrador;

public interface AdministradorService {

    Optional<Administrador> findById(Integer id);

    List<Administrador> findAll();

}
