package com.typeerror.myt.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.typeerror.myt.entities.BloqueoAgenda;

public interface BloqueoAgendaRepository extends JpaRepository<BloqueoAgenda, Integer> {
    List<BloqueoAgenda> findByTutorIdAndFecha(Integer tutorId, LocalDate fecha);
}
