package com.typeerror.myt.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.typeerror.myt.entities.TokenRecuperacion;

@Repository
public interface TokenRecuperacionRepository extends JpaRepository<TokenRecuperacion, Integer> {

    @EntityGraph(attributePaths = "usuario")
    Optional<TokenRecuperacion> findByToken(String token);

    void deleteByUsuarioId(Integer usuarioId);
}
