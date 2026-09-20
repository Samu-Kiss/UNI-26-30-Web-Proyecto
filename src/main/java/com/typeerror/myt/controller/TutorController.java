package com.typeerror.myt.controller;

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

import com.typeerror.myt.entities.ModalidadReserva;
import com.typeerror.myt.entities.Tutor;
import com.typeerror.myt.service.ContextoSesion;
import com.typeerror.myt.service.DisponibilidadTutorService;
import com.typeerror.myt.service.ReservaService;
import com.typeerror.myt.service.TutorService;

@Controller
@RequestMapping("/tutores")
public class TutorController {

    private final TutorService tutorService;
    private final ReservaService reservaService;
    private final DisponibilidadTutorService disponibilidadService;

    public TutorController(TutorService tutorService, ReservaService reservaService) {
        this(tutorService, reservaService, null);
    }

    @Autowired
    public TutorController(TutorService tutorService, ReservaService reservaService,
            DisponibilidadTutorService disponibilidadService) {
        this.tutorService = tutorService;
        this.reservaService = reservaService;
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

        Integer idEstudiante = estudianteIdSesion != null ? estudianteIdSesion : estudianteId;
        if (idEstudiante == null) {
            throw new IllegalArgumentException("Se requiere un estudiante válido para realizar la reserva");
        }

        try {
            reservaService.crearReserva(tutorId, idEstudiante, materiaId,
                    fecha, horaInicio, duracionMinutos, tema, modalidad);
            String redireccion = ContextoSesion.redireccion(
                    "/estudiantes/" + idEstudiante + "/reservas", sesion);
            return redireccion + "&reservaExitosa=true";
        } catch (IllegalArgumentException | IllegalStateException exception) {
            Tutor tutor = tutorService.findById(tutorId).orElse(null);
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
                : tutor != null ? tutor.getDisponibilidades() : null;

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
