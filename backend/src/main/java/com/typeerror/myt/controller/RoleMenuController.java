package com.typeerror.myt.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class RoleMenuController {

    @GetMapping("/estudiante")
    public String mostrarMenuEstudiante() {
        return "menu-estudiante";
    }

    @GetMapping("/tutor")
    public String mostrarMenuTutor() {
        return "menu-tutor";
    }
}
