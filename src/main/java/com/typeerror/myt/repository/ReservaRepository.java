package com.typeerror.myt.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.typeerror.myt.entities.Reserva;

public interface ReservaRepository extends JpaRepository<Reserva, Integer> {

    @Override
    @EntityGraph(attributePaths = {"estudiante", "estudiante.cliente", "tutor", "tutor.cliente"})
    List<Reserva> findAll();

    @EntityGraph(attributePaths = {"estudiante", "estudiante.cliente", "tutor", "tutor.cliente", "tutor.materias"})
    Optional<Reserva> findOneById(Integer id);
}
