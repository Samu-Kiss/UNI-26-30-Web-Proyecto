package com.typeerror.myt.repository;

import java.util.List;
import java.util.Optional;
import java.time.LocalDate;
import java.util.Collection;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.typeerror.myt.entities.Reserva;
import com.typeerror.myt.entities.EstadoReserva;

public interface ReservaRepository extends JpaRepository<Reserva, Integer> {

    @Override
    @EntityGraph(attributePaths = {"estudiante", "estudiante.usuario", "tutor", "tutor.usuario",
        "materia", "resena", "conversacion"})
    List<Reserva> findAll();

    @Override
    @EntityGraph(attributePaths = {"estudiante", "estudiante.usuario", "tutor", "tutor.usuario",
        "materia", "resena", "conversacion"})
    Optional<Reserva> findById(Integer id);

    @EntityGraph(attributePaths = {"estudiante", "estudiante.usuario", "tutor", "tutor.usuario",
        "materia", "tutor.materias", "resena", "conversacion"})
    Optional<Reserva> findOneById(Integer id);

    @EntityGraph(attributePaths = {"estudiante", "estudiante.usuario", "tutor", "tutor.usuario",
        "materia", "resena", "conversacion"})
    List<Reserva> findByTutorIdOrderByFechaAscHoraInicioAsc(Integer tutorId);

    @EntityGraph(attributePaths = {"estudiante", "estudiante.usuario", "tutor", "tutor.usuario",
        "materia", "resena", "conversacion"})
    List<Reserva> findByEstudianteIdOrderByFechaAscHoraInicioAsc(Integer estudianteId);

    @EntityGraph(attributePaths = {"resena", "conversacion"})
    List<Reserva> findByTutorIdAndFechaAndEstadoNotIn(
            Integer tutorId, LocalDate fecha, Collection<EstadoReserva> estados);

    @EntityGraph(attributePaths = {"estudiante", "estudiante.usuario", "tutor", "tutor.usuario",
        "materia", "resena", "conversacion"})
    @org.springframework.data.jpa.repository.Query("""
        SELECT r FROM Reserva r WHERE r.estudiante.id = :estudianteId
        AND (:estado IS NULL OR r.estado = :estado)
        ORDER BY r.fecha DESC, r.horaInicio DESC, r.id DESC
        """)
    List<Reserva> buscarPorEstudiante(
            @org.springframework.data.repository.query.Param("estudianteId") Integer estudianteId,
            @org.springframework.data.repository.query.Param("estado")
            @org.jspecify.annotations.Nullable EstadoReserva estado);

}
