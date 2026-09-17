package com.typeerror.myt.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

/** Mantiene funcionando el enlace historico mientras los consumidores migran a /usuarios. */
@Controller
@RequestMapping("/clientes")
public class ClienteRedirectController {

    @GetMapping
    public String redirigirAUsuarios() {
        return "redirect:/usuarios";
    }
}
