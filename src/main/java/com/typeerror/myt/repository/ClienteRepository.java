package com.typeerror.myt.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.typeerror.myt.entities.Cliente;

public interface ClienteRepository extends JpaRepository<Cliente, Integer> {

    Optional<Cliente> findByCorreoIgnoreCase(String correo);
}
