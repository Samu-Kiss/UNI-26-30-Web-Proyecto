package com.typeerror.myt.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.typeerror.myt.entities.Conversacion;

public interface ConversacionRepository extends JpaRepository<Conversacion, Integer> {

    @EntityGraph(attributePaths = {"reserva", "reserva.estudiante", "reserva.estudiante.usuario",
        "reserva.tutor", "reserva.tutor.usuario"})
    Optional<Conversacion> findByReservaId(Integer reservaId);

    @EntityGraph(attributePaths = {"reserva", "reserva.estudiante", "reserva.estudiante.usuario",
        "reserva.tutor", "reserva.tutor.usuario"})
    Optional<Conversacion> findOneById(Integer id);
}
