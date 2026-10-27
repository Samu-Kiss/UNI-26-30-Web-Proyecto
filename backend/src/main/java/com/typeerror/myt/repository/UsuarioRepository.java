package com.typeerror.myt.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.typeerror.myt.entities.RolUsuario;
import com.typeerror.myt.entities.Usuario;

public interface UsuarioRepository extends JpaRepository<Usuario, Integer> {

    @Override
    @EntityGraph(attributePaths = "roles")
    List<Usuario> findAll();

    @Override
    @EntityGraph(attributePaths = "roles")
    Optional<Usuario> findById(Integer id);

    @EntityGraph(attributePaths = "roles")
    Optional<Usuario> findByCorreoIgnoreCase(String correo);

    @EntityGraph(attributePaths = "roles")
    List<Usuario> findDistinctByRolesContainingOrderByIdAsc(RolUsuario rol);
}
