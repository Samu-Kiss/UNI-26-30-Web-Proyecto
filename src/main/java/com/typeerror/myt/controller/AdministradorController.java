package com.typeerror.myt.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import com.typeerror.myt.service.AdministradorService;

@Controller
@RequestMapping("/administradores")
public class AdministradorController {

    private final AdministradorService administradorService;

    @Autowired
    public AdministradorController(AdministradorService administradorService) {
        this.administradorService = administradorService;
    }

    @GetMapping
    public String listarAdministradores(Model model) {
        model.addAttribute("administradores", administradorService.findAll());
        return "administradores";
    }

}
