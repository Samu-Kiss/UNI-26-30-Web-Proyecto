package com.typeerror.myt.service;

import java.util.List;

import com.typeerror.myt.errors.InformacionNoValidaException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.typeerror.myt.entities.DisponibilidadTutor;
import com.typeerror.myt.repository.DisponibilidadTutorRepository;

@Service
public class DisponibilidadTutorService {

    private final DisponibilidadTutorRepository repository;

    public DisponibilidadTutorService(DisponibilidadTutorRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<DisponibilidadTutor> findByTutorId(Integer tutorId) {
        return repository.findByTutorId(tutorId);
    }

    @Transactional
    public DisponibilidadTutor guardar(DisponibilidadTutor disponibilidad) {
        if (!disponibilidad.tieneHorarioValido()) {
            throw new InformacionNoValidaException();
        }
        boolean seSolapa = repository.findByTutorIdAndDiaSemana(
                        disponibilidad.getTutor().getId(), disponibilidad.getDiaSemana()).stream()
                .filter(existente -> !existente.getId().equals(disponibilidad.getId()))
                .anyMatch(existente -> disponibilidad.getHoraInicio().isBefore(existente.getHoraFin())
                        && disponibilidad.getHoraFin().isAfter(existente.getHoraInicio()));
        if (seSolapa) {
            throw new IllegalStateException("La disponibilidad se solapa con otro intervalo");
        }
        return repository.save(disponibilidad);
    }
}
