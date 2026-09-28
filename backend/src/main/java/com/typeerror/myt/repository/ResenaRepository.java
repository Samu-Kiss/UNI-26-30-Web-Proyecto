package com.typeerror.myt.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.typeerror.myt.entities.Resena;

public interface ResenaRepository extends JpaRepository<Resena, Integer> {
    Optional<Resena> findByReservaId(Integer reservaId);
}
