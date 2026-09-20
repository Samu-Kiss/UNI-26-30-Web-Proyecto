package com.typeerror.myt.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;

import com.typeerror.myt.service.ReservaService;
import com.typeerror.myt.service.TutorService;
import com.typeerror.myt.entities.Tutor;


@Controller
@RequestMapping("/tutores")
public class TutorController {

    private final TutorService tutorService;
    private final ReservaService reservaService;

    public TutorController(TutorService tutorService, ReservaService reservaService) {
        this.tutorService = tutorService;
        this.reservaService = reservaService;
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

        return "reserva-form";
    }

    @GetMapping("/{tutorId}/reservas")
    public String listarReservasDelTutor(@PathVariable Integer tutorId,
            Model model) {
        model.addAttribute("tutor", tutorService.findById(tutorId)
                .orElseThrow(() -> new IllegalArgumentException("El tutor no existe")));
        model.addAttribute("reservas", reservaService.findByTutorId(tutorId));
        return "reservas-tutor";
    }

}
