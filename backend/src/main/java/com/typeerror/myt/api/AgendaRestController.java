package com.typeerror.myt.api;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import com.typeerror.myt.entities.BloqueoAgenda;
import com.typeerror.myt.entities.DiaSemana;
import com.typeerror.myt.entities.DisponibilidadTutor;
import com.typeerror.myt.entities.EstadoReserva;
import com.typeerror.myt.entities.Reserva;
import com.typeerror.myt.entities.RolUsuario;
import com.typeerror.myt.entities.Tutor;
import com.typeerror.myt.repository.BloqueoAgendaRepository;
import com.typeerror.myt.repository.DisponibilidadTutorRepository;
import com.typeerror.myt.repository.ReservaRepository;
import com.typeerror.myt.repository.TutorRepository;
import com.typeerror.myt.service.ContextoSesion;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/tutores/{tutorId}/agenda")
@Transactional(readOnly = true)
public class AgendaRestController {
    private final TutorRepository tutores;
    private final DisponibilidadTutorRepository horarios;
    private final BloqueoAgendaRepository bloqueos;
    private final ReservaRepository reservas;

    public AgendaRestController(TutorRepository tutores, DisponibilidadTutorRepository horarios,
            BloqueoAgendaRepository bloqueos, ReservaRepository reservas) {
        this.tutores = tutores;
        this.horarios = horarios;
        this.bloqueos = bloqueos;
        this.reservas = reservas;
    }

    public record Horario(@NotNull DiaSemana diaSemana, @NotNull LocalTime horaInicio,
            @NotNull LocalTime horaFin) { }

    public record Bloqueo(@NotNull LocalDate fecha, @NotNull LocalTime horaInicio,
            @NotNull LocalTime horaFin, @Size(max = 300) String motivo) { }

    public record Agenda(@NotNull @Size(max = 100) List<@Valid Horario> horarios,
            @NotNull @Size(max = 200) List<@Valid Bloqueo> bloqueos) { }

    @GetMapping
    public Agenda consultar(@PathVariable Integer tutorId) {
        return new Agenda(horarios.findByTutorId(tutorId).stream()
                .map(h -> new Horario(h.getDiaSemana(), h.getHoraInicio(), h.getHoraFin())).toList(),
                bloqueos.findByTutorId(tutorId).stream()
                .map(b -> new Bloqueo(b.getFecha(), b.getHoraInicio(), b.getHoraFin(), b.getMotivo())).toList());
    }

    @PutMapping
    @Transactional
    public Agenda guardar(@PathVariable Integer tutorId, @Valid @RequestBody Agenda agenda,
            @RequestAttribute("apiSesion") ContextoSesion sesion) {
        if (sesion.rol() != RolUsuario.TUTOR || !tutorId.equals(sesion.perfilId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo puedes gestionar tu agenda");
        }
        Tutor tutor = tutores.bloquearPorId(tutorId).orElseThrow();
        for (Horario h : agenda.horarios()) {
            validarIntervalo(h.horaInicio(), h.horaFin());
            if (agenda.horarios().stream().filter(o -> o.diaSemana() == h.diaSemana()
                    && solapa(h.horaInicio(), h.horaFin(), o.horaInicio(), o.horaFin())).count() > 1) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Hay horarios que se solapan");
            }
        }
        for (Bloqueo b : agenda.bloqueos()) {
            validarIntervalo(b.horaInicio(), b.horaFin());
        }
        var activas = reservas.findByTutorIdOrderByFechaAscHoraInicioAsc(tutorId).stream()
                .filter(r -> EnumSet.of(EstadoReserva.PENDIENTE, EstadoReserva.CONFIRMADA,
                        EstadoReserva.EN_CURSO).contains(r.getEstado()))
                .filter(r -> !r.getFecha().isBefore(LocalDate.now(ZoneId.of("America/Bogota")))).toList();
        for (Reserva r : activas) {
            if (!cubre(agenda, r.getFecha(), r.getHoraInicio(), r.calcularHoraFin())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "El cambio afecta la reserva #" + r.getId() + ". Conserva su horario o gestiónala primero.");
            }
        }
        horarios.deleteAll(horarios.findByTutorId(tutorId));
        bloqueos.deleteAll(bloqueos.findByTutorId(tutorId));
        horarios.flush();
        bloqueos.flush();
        for (Horario h : agenda.horarios()) {
            horarios.save(new DisponibilidadTutor(null, tutor, h.diaSemana(), h.horaInicio(), h.horaFin()));
        }
        for (Bloqueo b : agenda.bloqueos()) {
            bloqueos.save(new BloqueoAgenda(null, tutor, b.fecha(), b.horaInicio(), b.horaFin(), b.motivo()));
        }
        return agenda;
    }

    @GetMapping("/horas")
    public List<LocalTime> horas(@PathVariable Integer tutorId, @RequestParam LocalDate fecha,
            @RequestParam int duracion) {
        if (!List.of(60, 90, 120).contains(duracion)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selecciona 60, 90 o 120 minutos");
        }
        var tutor = tutores.findById(tutorId).orElseThrow();
        if (!Boolean.TRUE.equals(tutor.getDisponible()) || !Boolean.TRUE.equals(tutor.getUsuario().getActivo())) {
            return List.of();
        }
        Agenda agenda = consultar(tutorId);
        var ocupadas = reservas.findByTutorIdAndFechaAndEstadoNotIn(tutorId, fecha,
                EnumSet.of(EstadoReserva.CANCELADA, EstadoReserva.RECHAZADA));
        List<LocalTime> resultado = new ArrayList<>();
        for (int minuto = 0; minuto + duracion < 1440; minuto += 30) {
            LocalTime inicio = LocalTime.of(minuto / 60, minuto % 60);
            LocalTime fin = inicio.plusMinutes(duracion);
            if (fecha.atTime(inicio).isAfter(LocalDateTime.now(ZoneId.of("America/Bogota")))
                    && cubre(agenda, fecha, inicio, fin)
                    && ocupadas.stream().noneMatch(r -> solapa(inicio, fin,
                            r.getHoraInicio(), r.calcularHoraFin()))) {
                resultado.add(inicio);
            }
        }
        return resultado;
    }

    private boolean cubre(Agenda agenda, LocalDate fecha, LocalTime inicio, LocalTime fin) {
        DiaSemana dia = DiaSemana.values()[fecha.getDayOfWeek().getValue() - 1];
        return agenda.horarios().stream().anyMatch(h -> h.diaSemana() == dia
                && !inicio.isBefore(h.horaInicio()) && !fin.isAfter(h.horaFin()))
                && agenda.bloqueos().stream().noneMatch(b -> b.fecha().equals(fecha)
                        && solapa(inicio, fin, b.horaInicio(), b.horaFin()));
    }

    private boolean solapa(LocalTime inicio, LocalTime fin, LocalTime otroInicio, LocalTime otroFin) {
        return inicio.isBefore(otroFin) && fin.isAfter(otroInicio);
    }

    private void validarIntervalo(LocalTime inicio, LocalTime fin) {
        if (!fin.isAfter(inicio)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La hora final debe ser posterior al inicio");
        }
    }
}
