package com.typeerror.myt.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.typeerror.myt.entities.EstadoReserva;
import com.typeerror.myt.entities.Reserva;
import com.typeerror.myt.service.ContextoSesion;
import com.typeerror.myt.service.ReservaService;
import com.typeerror.myt.service.TutorService;

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
        model.addAttribute("tutores", tutorService.findAll());
        return "tutores";
    }

    @GetMapping("/{tutorId}/reservas")
    public String listarReservasDelTutor(@PathVariable Integer tutorId,
            Model model) {
        model.addAttribute("tutor", tutorService.findById(tutorId)
                .orElseThrow(() -> new IllegalArgumentException("El tutor no existe")));
        model.addAttribute("reservas", reservaService.findByTutorId(tutorId));
        return "reservas-tutor";
    }

    @PostMapping("/{tutorId}/reservas")
    public String cambiarEstadoReserva(
            @PathVariable Integer tutorId,
            @RequestParam Integer id,
            @RequestParam EstadoReserva estado,
            @RequestParam(required = false) String motivo,
            @RequestParam String sesion,
            Model model) {
        try {
            Reserva reserva = reservaService.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("La reserva no existe"));
            if (!reserva.getTutor().getId().equals(tutorId)) {
                throw new IllegalArgumentException("La reserva no pertenece a este tutor");
            }
            reservaService.cambiarEstado(id, estado, motivo);
        } catch (IllegalArgumentException | IllegalStateException exception) {
            var tutorOpt = tutorService.findById(tutorId);
            tutorOpt.ifPresent(t -> model.addAttribute("tutor", t));
            model.addAttribute("reservas", reservaService.findByTutorId(tutorId));
            model.addAttribute("error", exception.getMessage());
            return "reservas-tutor";
        }

        return ContextoSesion.redireccion("/tutores/" + tutorId + "/reservas", sesion);
    }

}
