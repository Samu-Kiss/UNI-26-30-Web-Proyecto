package com.typeerror.myt.controller;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.typeerror.myt.entities.EstadoReserva;
import com.typeerror.myt.entities.Estudiante;
import com.typeerror.myt.entities.Materia;
import com.typeerror.myt.entities.ModalidadReserva;
import com.typeerror.myt.entities.Reserva;
import com.typeerror.myt.entities.Tutor;
import com.typeerror.myt.repository.MateriaRepository;
import com.typeerror.myt.service.ContextoSesion;
import com.typeerror.myt.service.DisponibilidadTutorService;
import com.typeerror.myt.service.EstudianteService;
import com.typeerror.myt.service.ReservaService;
import com.typeerror.myt.service.TutorService;

@Controller
@RequestMapping("/tutores")
public class TutorController {

    private final TutorService tutorService;
    private final ReservaService reservaService;
    private final EstudianteService estudianteService;
    private final MateriaRepository materiaRepository;
    private final DisponibilidadTutorService disponibilidadService;

    public TutorController(TutorService tutorService, ReservaService reservaService) {
        this(tutorService, reservaService, null, null, null);
    }

    @Autowired
    public TutorController(TutorService tutorService, ReservaService reservaService,
            EstudianteService estudianteService, MateriaRepository materiaRepository,
            DisponibilidadTutorService disponibilidadService) {
        this.tutorService = tutorService;
        this.reservaService = reservaService;
        this.estudianteService = estudianteService;
        this.materiaRepository = materiaRepository;
        this.disponibilidadService = disponibilidadService;
    }

    @GetMapping
    public String listarTutores(Model model) {
        List<Tutor> tutores = tutorService.findAll();
        Map<Integer, String> calificaciones = new HashMap<>();

        for (Tutor tutor : tutores) {
            Optional<Double> promedio =
                tutorService.findCalificacionPromedio(tutor.getId());

            if (promedio.isPresent()) {
                calificaciones.put(tutor.getId(), promedio.get() + " / 5");
            } else {
                calificaciones.put(tutor.getId(), "Sin calificaciones");
            }
        }

        model.addAttribute("tutores", tutores);
        model.addAttribute("calificaciones", calificaciones);

        return "tutores";
    }

    @GetMapping("/{tutorId}/reservar")
    public String mostrarFormularioReserva(
        @PathVariable Integer tutorId,
        Model model) {

        Tutor tutor = tutorService.findById(tutorId)
                .orElseThrow(() ->
                        new IllegalArgumentException("El tutor no existe"));

        if (!Boolean.TRUE.equals(tutor.getDisponible())) {
            throw new IllegalStateException("El tutor no está disponible");
        }

        model.addAttribute("tutor", tutor);
        model.addAttribute("disponibilidades", obtenerDisponibilidadesDto(tutorId, tutor));

        return "reserva-form";
    }

    @PostMapping("/{tutorId}/reservar")
    public String procesarReserva(
            @PathVariable Integer tutorId,
            @RequestParam Integer materiaId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime horaInicio,
            @RequestParam Integer duracionMinutos,
            @RequestParam String tema,
            @RequestParam ModalidadReserva modalidad,
            @RequestParam(required = false) Integer estudianteId,
            @RequestAttribute(value = "perfilIdSesion", required = false) Integer estudianteIdSesion,
            @RequestParam String sesion,
            Model model) {

        Tutor tutor = tutorService.findById(tutorId)
                .orElseThrow(() -> new IllegalArgumentException("El tutor no existe"));

        Integer idEstudiante = estudianteIdSesion != null ? estudianteIdSesion : estudianteId;
        if (idEstudiante == null && estudianteService != null) {
            var estudiantes = estudianteService.findAll();
            if (!estudiantes.isEmpty()) {
                idEstudiante = estudiantes.getFirst().getId();
            }
        }
        if (idEstudiante == null) {
            throw new IllegalArgumentException("Se requiere un estudiante válido para realizar la reserva");
        }

        Estudiante estudiante = estudianteService != null
                ? estudianteService.findById(idEstudiante)
                        .orElseThrow(() -> new IllegalArgumentException("El estudiante no existe"))
                : null;

        Materia materia = materiaRepository != null
                ? materiaRepository.findById(materiaId)
                        .orElseThrow(() -> new IllegalArgumentException("La materia no existe"))
                : null;

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

        try {
            reservaService.guardar(reserva);
            String redireccion = ContextoSesion.redireccion(
                    "/estudiantes/" + idEstudiante + "/reservas", sesion);
            return redireccion + "&reservaExitosa=true";
        } catch (IllegalArgumentException | IllegalStateException exception) {
            model.addAttribute("error", exception.getMessage());
            model.addAttribute("tutor", tutor);
            model.addAttribute("disponibilidades", obtenerDisponibilidadesDto(tutorId, tutor));
            return "reserva-form";
        }
    }

    @GetMapping("/{tutorId}/reservas")
    public String listarReservasDelTutor(@PathVariable Integer tutorId,
            Model model) {
        model.addAttribute("tutor", tutorService.findById(tutorId)
                .orElseThrow(() -> new IllegalArgumentException("El tutor no existe")));
        model.addAttribute("reservas", reservaService.findByTutorId(tutorId));
        return "reservas-tutor";
    }

    private List<Map<String, String>> obtenerDisponibilidadesDto(Integer tutorId, Tutor tutor) {
        var disponibilidadesRaw = disponibilidadService != null
                ? disponibilidadService.findByTutorId(tutorId)
                : tutor.getDisponibilidades();

        if (disponibilidadesRaw == null) {
            return List.of();
        }

        return disponibilidadesRaw.stream()
                .map(d -> Map.of(
                        "diaSemana", d.getDiaSemana() != null ? d.getDiaSemana().name() : "",
                        "horaInicio", d.getHoraInicio() != null ? d.getHoraInicio().toString() : "",
                        "horaFin", d.getHoraFin() != null ? d.getHoraFin().toString() : ""
                ))
                .toList();
    }

}
