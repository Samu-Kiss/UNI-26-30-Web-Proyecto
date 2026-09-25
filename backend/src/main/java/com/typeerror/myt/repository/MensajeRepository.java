package com.typeerror.myt.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.typeerror.myt.entities.Mensaje;

public interface MensajeRepository extends JpaRepository<Mensaje, Long> {

    @EntityGraph(attributePaths = "remitente")
    List<Mensaje> findByConversacionIdOrderByFechaEnvioAsc(Integer conversacionId);

    @EntityGraph(attributePaths = {"remitente", "conversacion", "conversacion.reserva",
        "conversacion.reserva.estudiante", "conversacion.reserva.estudiante.usuario",
        "conversacion.reserva.tutor", "conversacion.reserva.tutor.usuario"})
    Optional<Mensaje> findOneById(Long id);
}
