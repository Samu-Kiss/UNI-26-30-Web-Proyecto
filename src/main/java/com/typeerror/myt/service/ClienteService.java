package com.typeerror.myt.service;

import java.util.List;
import java.util.Optional;

import com.typeerror.myt.entities.Cliente;

public interface ClienteService {

    Optional<Cliente> findById(Integer id);

    List<Cliente> findAll();

    Cliente guardar(Cliente cliente);

    void desactivar(Integer id);

    void activar(Integer id);

}
