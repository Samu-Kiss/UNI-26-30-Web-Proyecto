package com.typeerror.myt.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.typeerror.myt.entities.Tutor;

public interface TutorRepository extends JpaRepository<Tutor, Integer> {

    boolean existsByUsuarioId(Integer usuarioId);

    @Override
    @EntityGraph(attributePaths = {"usuario", "materias"})
    List<Tutor> findAll();

    @EntityGraph(attributePaths = {"usuario", "materias", "reservas", "reservas.estudiante",
        "reservas.estudiante.usuario"})
    Optional<Tutor> findOneById(Integer id);

    @EntityGraph(attributePaths = "usuario")
    Optional<Tutor> findByUsuarioId(Integer usuarioId);

    @Query("""
        SELECT AVG(resena.calificacion)
        FROM Tutor tutor
        JOIN tutor.reservas reserva
        JOIN reserva.resena resena
        WHERE tutor.id = :tutorId
        """)

        Optional<Double> findCalificacionPromedioByTutorId(
            @Param("tutorId") Integer tutorId);

}
