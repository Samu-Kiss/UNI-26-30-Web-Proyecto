package com.typeerror.myt.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import com.typeerror.myt.errors.EstudianteNotFoundException;
import com.typeerror.myt.errors.InformacionIncompletaException;
import com.typeerror.myt.errors.InformacionNoValidaException;
import com.typeerror.myt.errors.MateriaNotFoundException;
import com.typeerror.myt.errors.ReservaNotFoundException;
import com.typeerror.myt.errors.SelfReservation;
import com.typeerror.myt.errors.TutorNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.typeerror.myt.entities.DiaSemana;
import com.typeerror.myt.entities.EstadoReserva;
import com.typeerror.myt.entities.Estudiante;
import com.typeerror.myt.entities.Materia;
import com.typeerror.myt.entities.ModalidadReserva;
import com.typeerror.myt.entities.Reserva;
import com.typeerror.myt.entities.Tutor;
import com.typeerror.myt.repository.BloqueoAgendaRepository;
import com.typeerror.myt.repository.DisponibilidadTutorRepository;
import com.typeerror.myt.repository.EstudianteRepository;
import com.typeerror.myt.repository.MateriaRepository;
import com.typeerror.myt.repository.ReservaRepository;
import com.typeerror.myt.repository.TutorRepository;

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
    private final TutorRepository tutorRepository;
    private final EstudianteRepository estudianteRepository;
    private final MateriaRepository materiaRepository;
    private final DisponibilidadTutorRepository disponibilidadRepository;
    private final BloqueoAgendaRepository bloqueoRepository;

    public ReservaServiceImpl(ReservaRepository reservaRepository,
            TutorRepository tutorRepository,
            EstudianteRepository estudianteRepository,
            MateriaRepository materiaRepository,
            DisponibilidadTutorRepository disponibilidadRepository,
            BloqueoAgendaRepository bloqueoRepository) {
        this.reservaRepository = reservaRepository;
        this.tutorRepository = tutorRepository;
        this.estudianteRepository = estudianteRepository;
        this.materiaRepository = materiaRepository;
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
    public List<Reserva> findByTutorId(Integer tutorId) {
        return reservaRepository.findByTutorIdOrderByFechaAscHoraInicioAsc(tutorId);
    }

    @Override
    public List<Reserva> findByEstudianteId(Integer estudianteId) {
        return reservaRepository.findByEstudianteIdOrderByFechaAscHoraInicioAsc(estudianteId);
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
                .orElseThrow(() -> new ReservaNotFoundException(id));
        if (!TRANSICIONES.getOrDefault(reserva.getEstado(), Set.of()).contains(nuevoEstado)) {
            throw new IllegalStateException("Transicion de estado no permitida");
        }
        reserva.setEstado(nuevoEstado);
        if (nuevoEstado == EstadoReserva.CANCELADA || nuevoEstado == EstadoReserva.RECHAZADA) {

            if (motivo == null || motivo.isBlank()) {
                throw new InformacionIncompletaException();
            }

            if (motivo.length() > 500) {
                throw new IllegalArgumentException(
                    "El motivo no puede superar los 500 caracteres");
            }
            reserva.setMotivoCancelacion(motivo);
            reserva.setFechaCancelacion(LocalDateTime.now(ZoneOffset.UTC));
        }
            return reservaRepository.save(reserva);
    }

    @Override
    @Transactional
    public Reserva crearReserva(Integer tutorId, Integer estudianteId, Integer materiaId,
            LocalDate fecha, LocalTime horaInicio, Integer duracionMinutos,
            String tema, ModalidadReserva modalidad) {

        Tutor tutor = tutorRepository.findOneById(tutorId)
                .orElseThrow(() -> new TutorNotFoundException(tutorId));

        if (!Boolean.TRUE.equals(tutor.getDisponible())) {
            throw new IllegalStateException("El tutor no está disponible");
        }

        Estudiante estudiante = estudianteRepository.findOneById(estudianteId)
                .orElseThrow(() -> new EstudianteNotFoundException(estudianteId));

        Materia materia = materiaRepository.findById(materiaId)
                .orElseThrow(() -> new MateriaNotFoundException(materiaId));

        String ubicacionOEnlace = modalidad == ModalidadReserva.VIRTUAL
                ? "https://meet.google.com/myt-tutoria"
                : "Campus Universitario / Aula del Tutor";

        BigDecimal costoTotal = tutor.getTarifaPorHora()
                .multiply(BigDecimal.valueOf(duracionMinutos))
                .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);

        Reserva reserva = new Reserva();
        reserva.setTutor(tutor);
        reserva.setEstudiante(estudiante);
        reserva.setMateria(materia);
        reserva.setFecha(fecha);
        reserva.setHoraInicio(horaInicio);
        reserva.setDuracionMinutos(duracionMinutos);
        reserva.setTema(tema);
        reserva.setModalidad(modalidad);
        reserva.setUbicacionOEnlace(ubicacionOEnlace);
        reserva.setEstado(EstadoReserva.PENDIENTE);
        reserva.setCostoTotal(costoTotal);
        reserva.setMoneda("COP");

        return guardar(reserva);
    }

    private void validarDatos(Reserva reserva) {
        if (reserva.getEstudiante() == null || reserva.getTutor() == null
                || reserva.getMateria() == null) {
            throw new InformacionIncompletaException();
        }
        if (reserva.getFecha() == null || reserva.getHoraInicio() == null
                || reserva.getDuracionMinutos() == null || reserva.getDuracionMinutos() <= 0) {
            throw new InformacionNoValidaException();
        }
        if (reserva.getEstudiante().getUsuario().getId()
                .equals(reserva.getTutor().getUsuario().getId())) {
            throw new SelfReservation();
        }
        if (reserva.getModalidad() == ModalidadReserva.VIRTUAL
                && (reserva.getUbicacionOEnlace() == null
                || reserva.getUbicacionOEnlace().isBlank())) {
            throw new InformacionIncompletaException();
        }
    }

    private void validarSolapamiento(Reserva reserva) {
        LocalTime fin = reserva.calcularHoraFin();
        if (fin == null) {
            throw new InformacionIncompletaException();
        }
        var reservasDelDia = reservaRepository.findByTutorIdAndFechaAndEstadoNotIn(
                reserva.getTutor().getId(), reserva.getFecha(),
                EnumSet.of(EstadoReserva.CANCELADA, EstadoReserva.RECHAZADA));
        boolean seSolapa = reservasDelDia.stream()
                .filter(existente -> !existente.getId().equals(reserva.getId()))
                .anyMatch(existente -> reserva.getHoraInicio().isBefore(existente.calcularHoraFin())
                        && fin.isAfter(existente.getHoraInicio()));
        if (seSolapa) {
            throw new InformacionNoValidaException();
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
            throw new InformacionNoValidaException();
        }
        boolean bloqueada = bloqueoRepository.findByTutorIdAndFecha(
                        reserva.getTutor().getId(), reserva.getFecha()).stream()
                .anyMatch(bloqueo -> reserva.getHoraInicio().isBefore(bloqueo.getHoraFin())
                        && fin.isAfter(bloqueo.getHoraInicio()));
        if (bloqueada) {
            throw new InformacionNoValidaException();
        }
    }


    private DiaSemana convertirDia(int diaIso) {
        return DiaSemana.values()[diaIso - 1];
    }

}
