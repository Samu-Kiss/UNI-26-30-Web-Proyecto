package com.typeerror.myt.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.typeerror.myt.service.LoginService;
import com.typeerror.myt.service.UsuarioAutenticado;

@Controller
public class LoginController {

    private final LoginService loginService;

    public LoginController(LoginService loginService) {
        this.loginService = loginService;
    }

    @GetMapping("/login")
    public String mostrarLogin() {
        return "login";
    }

    @PostMapping("/login")
    public String iniciarSesion(@RequestParam String correo,
            @RequestParam String contrasena,
            Model model) {
        var opciones = loginService.autenticar(correo, contrasena);
        if (opciones.isEmpty()) {
            return mostrarCredencialesInvalidas(correo, model);
        }
        if (opciones.size() == 1) {
            return rutaSegunRol(opciones.getFirst());
        }
        model.addAttribute("opciones", opciones);
        return "seleccionar-rol";
    }

    private String rutaSegunRol(UsuarioAutenticado usuario) {
        return "redirect:" + usuario.ruta();
    }

    private String mostrarCredencialesInvalidas(String correo, Model model) {
        model.addAttribute("correo", correo);
        model.addAttribute("error", "Correo o contraseña incorrectos");
        return "login";
    }
}
