package com.typeerror.myt.service;

import java.util.List;
import java.util.Optional;

import com.typeerror.myt.entities.Reserva;
import com.typeerror.myt.entities.EstadoReserva;

public interface ReservaService {

    Optional<Reserva> findById(Integer id);

    List<Reserva> findAll();

    Reserva guardar(Reserva reserva);

    Reserva cambiarEstado(Integer id, EstadoReserva nuevoEstado, String motivo);

}
