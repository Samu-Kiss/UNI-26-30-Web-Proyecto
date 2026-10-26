package com.typeerror.myt.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.typeerror.myt.entities.Tutor;

public interface TutorRepository extends JpaRepository<Tutor, Integer> {

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM Tutor t WHERE t.id = :id")
    Optional<Tutor> bloquearPorId(@Param("id") Integer id);

    boolean existsByUsuarioId(Integer usuarioId);

    @Override
    @EntityGraph(attributePaths = {"usuario", "materias"})
    List<Tutor> findAll();

    @EntityGraph(attributePaths = {"usuario", "materias", "disponibilidades", "reservas", "reservas.estudiante",
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


    @Query("""
        SELECT DISTINCT t FROM Tutor t LEFT JOIN t.materias m
        WHERE (:materiaId IS NULL OR m.id = :materiaId)
        AND (:tarifaMax IS NULL OR t.tarifaPorHora <= :tarifaMax)
        AND t.usuario.activo = true
        """)
    org.springframework.data.domain.Page<Tutor> buscar(
            @Param("materiaId") @org.jspecify.annotations.Nullable Integer materiaId,
            @Param("tarifaMax") java.math.@org.jspecify.annotations.Nullable BigDecimal tarifaMax,
            org.springframework.data.domain.Pageable pageable);

}
