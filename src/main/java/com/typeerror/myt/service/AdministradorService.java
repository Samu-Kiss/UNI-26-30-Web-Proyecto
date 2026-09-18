package com.typeerror.myt.service;

import java.util.List;
import java.util.Optional;

import com.typeerror.myt.entities.Usuario;

public interface AdministradorService {

    Optional<Usuario> findById(Integer id);

    List<Usuario> findAll();

}
