package com.typeerror.myt.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.typeerror.myt.entities.Tutor;

public interface TutorRepository extends JpaRepository<Tutor, Integer> {

    @Override
    @EntityGraph(attributePaths = {"cliente", "materias"})
    List<Tutor> findAll();

    @EntityGraph(attributePaths = {"cliente", "materias", "reservas", "reservas.estudiante",
        "reservas.estudiante.cliente"})
    Optional<Tutor> findOneById(Integer id);

}
