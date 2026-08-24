package com.typeerror.myt.service;

import java.util.List;
import java.util.Optional;

import com.typeerror.myt.entities.Reserva;

public interface ReservaService {

    Optional<Reserva> findById(Integer id);

    List<Reserva> findAll();

}
