package com.typeerror.myt.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;

import com.typeerror.myt.service.ReservaService;
import com.typeerror.myt.service.EstudianteService;

@Controller
@RequestMapping("/estudiantes")
public class EstudianteController {

    private final EstudianteService estudianteService;
    private final ReservaService reservaService;

    public EstudianteController(EstudianteService estudianteService,
            ReservaService reservaService) {
        this.estudianteService = estudianteService;
        this.reservaService = reservaService;
    }

    @GetMapping
    public String listarEstudiantes(Model model) {
        model.addAttribute("estudiantes", estudianteService.findAll());
        return "estudiantes";
    }

    @GetMapping("/{estudianteId}/reservas")
    public String listarReservas(@PathVariable Integer estudianteId, Model model) {
        model.addAttribute("estudiante", estudianteService.findById(estudianteId)
                .orElseThrow(() -> new IllegalArgumentException("El estudiante no existe")));
        model.addAttribute("reservas", reservaService.findByEstudianteId(estudianteId));
        return "reservas-estudiante";
    }

}
