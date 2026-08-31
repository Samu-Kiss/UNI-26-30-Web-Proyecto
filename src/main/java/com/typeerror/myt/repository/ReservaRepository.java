package com.typeerror.myt.repository;

import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.typeerror.myt.entities.Reserva;

public interface ReservaRepository extends JpaRepository<Reserva, Integer> {

    @Override
    @EntityGraph(attributePaths = {"estudiante", "estudiante.cliente", "tutor", "tutor.cliente"})
    List<Reserva> findAll();
}
