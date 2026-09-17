package com.typeerror.myt.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.typeerror.myt.entities.DiaSemana;
import com.typeerror.myt.entities.DisponibilidadTutor;

public interface DisponibilidadTutorRepository extends JpaRepository<DisponibilidadTutor, Integer> {
    List<DisponibilidadTutor> findByTutorIdAndDiaSemana(Integer tutorId, DiaSemana diaSemana);
}
