package com.typeerror.myt.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.typeerror.myt.entities.Estudiante;

public interface EstudianteRepository extends JpaRepository<Estudiante, Integer> {

    @Override
    @EntityGraph(attributePaths = "cliente")
    List<Estudiante> findAll();

    @EntityGraph(attributePaths = {"cliente", "reservas", "reservas.tutor", "reservas.tutor.cliente"})
    Optional<Estudiante> findOneById(Integer id);

}
