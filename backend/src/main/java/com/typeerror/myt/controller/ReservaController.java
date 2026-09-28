package com.typeerror.myt.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;

import com.typeerror.myt.service.ReservaService;
import com.typeerror.myt.entities.EstadoReserva;
import com.typeerror.myt.service.ContextoSesion;

@Controller
@RequestMapping("/reservas")
public class ReservaController {

    private final ReservaService reservaService;

    public ReservaController(ReservaService reservaService) {
        this.reservaService = reservaService;
    }

    @GetMapping
    public String listarReservas(Model model) {
        model.addAttribute("reservas", reservaService.findAll());
        return "mostrar_reservas";
    }

    @PostMapping
    public String cambiarEstado(
        @RequestParam Integer id,
        @RequestParam EstadoReserva estado,
        @RequestParam(required = false) String motivo,
        @RequestParam String sesion,
        Model model) {

    try {
        reservaService.cambiarEstado(id, estado, motivo);
    } catch (IllegalArgumentException | IllegalStateException exception) {
        model.addAttribute("reservas", reservaService.findAll());
        model.addAttribute("error", exception.getMessage());
        return "mostrar_reservas";
    }

    return ContextoSesion.redireccion("/reservas", sesion);
}

}
