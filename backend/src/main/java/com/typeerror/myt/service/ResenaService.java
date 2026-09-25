package com.typeerror.myt.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.typeerror.myt.entities.EstadoReserva;
import com.typeerror.myt.entities.Resena;
import com.typeerror.myt.repository.ResenaRepository;

@Service
public class ResenaService {

    private final ResenaRepository resenaRepository;

    public ResenaService(ResenaRepository resenaRepository) {
        this.resenaRepository = resenaRepository;
    }

    @Transactional
    public Resena guardar(Resena resena) {
        if (resena.getReserva() == null
                || resena.getReserva().getEstado() != EstadoReserva.COMPLETADA) {
            throw new IllegalStateException("Solo se pueden calificar reservas completadas");
        }
        resenaRepository.findByReservaId(resena.getReserva().getId())
                .filter(existente -> !existente.getId().equals(resena.getId()))
                .ifPresent(existente -> {
                    throw new IllegalStateException("La reserva ya tiene una resena");
                });
        return resenaRepository.save(resena);
    }
}
