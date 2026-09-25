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
    @EntityGraph(attributePaths = {"estudiante", "estudiante.usuario", "tutor", "tutor.usuario", "materia"})
    List<Reserva> findAll();

    @EntityGraph(attributePaths = {"estudiante", "estudiante.usuario", "tutor", "tutor.usuario", "materia",
        "tutor.materias", "resena"})
    Optional<Reserva> findOneById(Integer id);

    @EntityGraph(attributePaths = {"estudiante", "estudiante.usuario", "tutor", "tutor.usuario"})
    List<Reserva> findByTutorIdOrderByFechaAscHoraInicioAsc(Integer tutorId);

    @EntityGraph(attributePaths = {"estudiante", "estudiante.usuario", "tutor", "tutor.usuario", "materia"})
    List<Reserva> findByEstudianteIdOrderByFechaAscHoraInicioAsc(Integer estudianteId);

    List<Reserva> findByTutorIdAndFechaAndEstadoNotIn(
            Integer tutorId, LocalDate fecha, Collection<EstadoReserva> estados);
}
