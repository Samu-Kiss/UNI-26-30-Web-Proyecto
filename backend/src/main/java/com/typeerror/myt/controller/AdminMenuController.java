package com.typeerror.myt.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class AdminMenuController {

    @GetMapping("/admin")
    public String mostrarMenu() {
        return "menu-administrativo";
    }
}
