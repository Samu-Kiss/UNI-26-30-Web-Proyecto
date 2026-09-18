package com.typeerror.myt.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.typeerror.myt.entities.RolUsuario;
import com.typeerror.myt.entities.Usuario;

public interface UsuarioRepository extends JpaRepository<Usuario, Integer> {

    Optional<Usuario> findByCorreoIgnoreCase(String correo);

    List<Usuario> findDistinctByRolesContainingOrderByIdAsc(RolUsuario rol);
}
