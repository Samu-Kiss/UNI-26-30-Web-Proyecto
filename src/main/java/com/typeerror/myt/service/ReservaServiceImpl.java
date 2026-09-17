package com.typeerror.myt.service;

import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.typeerror.myt.entities.Reserva;
import com.typeerror.myt.entities.EstadoReserva;
import com.typeerror.myt.entities.ModalidadReserva;
import com.typeerror.myt.entities.DiaSemana;
import com.typeerror.myt.repository.BloqueoAgendaRepository;
import com.typeerror.myt.repository.DisponibilidadTutorRepository;
import com.typeerror.myt.repository.ReservaRepository;

@Service
@Transactional(readOnly = true)
public class ReservaServiceImpl implements ReservaService {

    private static final Map<EstadoReserva, Set<EstadoReserva>> TRANSICIONES = Map.of(
            EstadoReserva.PENDIENTE, EnumSet.of(EstadoReserva.CONFIRMADA,
                    EstadoReserva.RECHAZADA, EstadoReserva.CANCELADA),
            EstadoReserva.CONFIRMADA, EnumSet.of(EstadoReserva.EN_CURSO, EstadoReserva.CANCELADA),
            EstadoReserva.EN_CURSO, EnumSet.of(EstadoReserva.COMPLETADA, EstadoReserva.CANCELADA),
            EstadoReserva.RECHAZADA, EnumSet.noneOf(EstadoReserva.class),
            EstadoReserva.COMPLETADA, EnumSet.noneOf(EstadoReserva.class),
            EstadoReserva.CANCELADA, EnumSet.noneOf(EstadoReserva.class));

    private final ReservaRepository reservaRepository;
    private final DisponibilidadTutorRepository disponibilidadRepository;
    private final BloqueoAgendaRepository bloqueoRepository;

    public ReservaServiceImpl(ReservaRepository reservaRepository,
            DisponibilidadTutorRepository disponibilidadRepository,
            BloqueoAgendaRepository bloqueoRepository) {
        this.reservaRepository = reservaRepository;
        this.disponibilidadRepository = disponibilidadRepository;
        this.bloqueoRepository = bloqueoRepository;
    }

    @Override
    public Optional<Reserva> findById(Integer id) {
        return reservaRepository.findOneById(id);
    }

    @Override
    public List<Reserva> findAll() {
        return reservaRepository.findAll();
    }

    @Override
    @Transactional
    public Reserva guardar(Reserva reserva) {
        validarDatos(reserva);
        validarDisponibilidad(reserva);
        validarSolapamiento(reserva);
        return reservaRepository.save(reserva);
    }

    @Override
    @Transactional
    public Reserva cambiarEstado(Integer id, EstadoReserva nuevoEstado, String motivo) {
        Reserva reserva = reservaRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("La reserva no existe"));
        if (!TRANSICIONES.getOrDefault(reserva.getEstado(), Set.of()).contains(nuevoEstado)) {
            throw new IllegalStateException("Transicion de estado no permitida");
        }
        reserva.setEstado(nuevoEstado);
        if (nuevoEstado == EstadoReserva.CANCELADA || nuevoEstado == EstadoReserva.RECHAZADA) {
            if (motivo == null || motivo.isBlank()) {
                throw new IllegalArgumentException("El motivo es obligatorio al cancelar o rechazar");
            }
            reserva.setMotivoCancelacion(motivo);
            reserva.setFechaCancelacion(LocalDateTime.now());
        }
        return reservaRepository.save(reserva);
    }

    private void validarDatos(Reserva reserva) {
        if (reserva.getEstudiante() == null || reserva.getTutor() == null
                || reserva.getMateria() == null) {
            throw new IllegalArgumentException("Estudiante, tutor y materia son obligatorios");
        }
        if (reserva.getFecha() == null || reserva.getHoraInicio() == null
                || reserva.getDuracionMinutos() == null || reserva.getDuracionMinutos() <= 0) {
            throw new IllegalArgumentException("La fecha, hora y duracion deben ser validas");
        }
        if (reserva.getEstudiante().getUsuario().getId()
                .equals(reserva.getTutor().getUsuario().getId())) {
            throw new IllegalArgumentException("Una persona no puede reservarse a si misma");
        }
        if (reserva.getModalidad() == ModalidadReserva.VIRTUAL
                && (reserva.getUbicacionOEnlace() == null
                || reserva.getUbicacionOEnlace().isBlank())) {
            throw new IllegalArgumentException("La reserva virtual necesita un enlace");
        }
    }

    private void validarSolapamiento(Reserva reserva) {
        LocalTime fin = reserva.calcularHoraFin();
        if (fin == null) {
            throw new IllegalArgumentException("La hora y la duracion son obligatorias");
        }
        var reservasDelDia = reservaRepository.findByTutorIdAndFechaAndEstadoNotIn(
                reserva.getTutor().getId(), reserva.getFecha(),
                EnumSet.of(EstadoReserva.CANCELADA, EstadoReserva.RECHAZADA));
        boolean seSolapa = reservasDelDia.stream()
                .filter(existente -> !existente.getId().equals(reserva.getId()))
                .anyMatch(existente -> reserva.getHoraInicio().isBefore(existente.calcularHoraFin())
                        && fin.isAfter(existente.getHoraInicio()));
        if (seSolapa) {
            throw new IllegalStateException("El tutor ya tiene una reserva en ese horario");
        }
    }

    private void validarDisponibilidad(Reserva reserva) {
        LocalTime fin = reserva.calcularHoraFin();
        DiaSemana dia = convertirDia(reserva.getFecha().getDayOfWeek().getValue());
        var intervalos = disponibilidadRepository.findByTutorIdAndDiaSemana(
                reserva.getTutor().getId(), dia);
        boolean dentroDeAgenda = intervalos.isEmpty() || intervalos.stream()
                .anyMatch(intervalo -> !reserva.getHoraInicio().isBefore(intervalo.getHoraInicio())
                        && !fin.isAfter(intervalo.getHoraFin()));
        if (!dentroDeAgenda) {
            throw new IllegalStateException("La reserva esta fuera de la disponibilidad del tutor");
        }
        boolean bloqueada = bloqueoRepository.findByTutorIdAndFecha(
                        reserva.getTutor().getId(), reserva.getFecha()).stream()
                .anyMatch(bloqueo -> reserva.getHoraInicio().isBefore(bloqueo.getHoraFin())
                        && fin.isAfter(bloqueo.getHoraInicio()));
        if (bloqueada) {
            throw new IllegalStateException("El tutor bloqueo ese horario");
        }
    }

    private DiaSemana convertirDia(int diaIso) {
        return DiaSemana.values()[diaIso - 1];
    }

}
