package com.typeerror.myt.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.typeerror.myt.entities.Materia;

public interface MateriaRepository extends JpaRepository<Materia, Integer> {

    Optional<Materia> findByNombre(String nombre);
}
