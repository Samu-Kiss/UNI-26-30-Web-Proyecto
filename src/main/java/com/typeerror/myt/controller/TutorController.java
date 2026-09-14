package com.typeerror.myt.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;

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

}
