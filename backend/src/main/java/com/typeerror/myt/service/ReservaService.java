package com.typeerror.myt.service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import com.typeerror.myt.entities.ModalidadReserva;
import com.typeerror.myt.entities.Reserva;
import com.typeerror.myt.entities.EstadoReserva;

public interface ReservaService {

    Optional<Reserva> findById(Integer id);

    List<Reserva> findAll();

    List<Reserva> findByTutorId(Integer tutorId);

    List<Reserva> findByEstudianteId(Integer estudianteId);

    Reserva guardar(Reserva reserva);

    Reserva cambiarEstado(Integer id, EstadoReserva nuevoEstado, String motivo);

    Reserva crearReserva(Integer tutorId, Integer estudianteId, Integer materiaId,
            LocalDate fecha, LocalTime horaInicio, Integer duracionMinutos,
            String tema, ModalidadReserva modalidad);

}
