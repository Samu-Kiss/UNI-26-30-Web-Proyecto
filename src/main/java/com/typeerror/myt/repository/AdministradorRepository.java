package com.typeerror.myt.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.typeerror.myt.entities.Administrador;

public interface AdministradorRepository extends JpaRepository<Administrador, Integer> {

    Optional<Administrador> findByCorreoIgnoreCase(String correo);

}
