package com.typeerror.myt.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;

import com.typeerror.myt.entities.Tutor;
import com.typeerror.myt.service.ReservaService;
import com.typeerror.myt.service.TutorService;

@Controller
@RequestMapping("/reservas")
public class ReservaController {

    private final ReservaService reservaService;
    private final TutorService tutorService;

    public ReservaController(ReservaService reservaService, TutorService tutorService) {
    this.reservaService = reservaService;
    this.tutorService = tutorService;
}

    @GetMapping
    public String listarReservas(Model model) {
        model.addAttribute("reservas", reservaService.findAll());
        return "mostrar_reservas";
    }

    @GetMapping("/nueva/{tutorId}")
    public String nuevaReserva(
            @PathVariable Integer tutorId,
            Model model) {

        Tutor tutor = tutorService.findById(tutorId)
                .orElseThrow(() ->
                        new IllegalArgumentException("El tutor no existe"));

        model.addAttribute("tutor", tutor);

        return "reserva-form";
    }

}
