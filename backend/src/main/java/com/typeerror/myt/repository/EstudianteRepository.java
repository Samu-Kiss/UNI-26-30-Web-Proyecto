package com.typeerror.myt.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.typeerror.myt.entities.Estudiante;

public interface EstudianteRepository extends JpaRepository<Estudiante, Integer> {

    boolean existsByUsuarioId(Integer usuarioId);

    @Override
    @EntityGraph(attributePaths = {"usuario", "usuario.roles"})
    List<Estudiante> findAll();

    @EntityGraph(attributePaths = {"usuario", "usuario.roles"})
    Optional<Estudiante> findOneById(Integer id);

    @EntityGraph(attributePaths = {"usuario", "usuario.roles"})
    Optional<Estudiante> findByUsuarioId(Integer usuarioId);

}
