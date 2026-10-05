package com.typeerror.myt.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.typeerror.myt.service.LoginService;
import com.typeerror.myt.service.UsuarioAutenticado;
import com.typeerror.myt.service.JwtSesionService;
import com.typeerror.myt.service.SesionService;

import java.util.List;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Controller
public class LoginController {

    private final LoginService loginService;
    private final JwtSesionService jwtSesionService;
    private final SesionService sesionService;

    public LoginController(LoginService loginService, JwtSesionService jwtSesionService,
            SesionService sesionService) {
        this.loginService = loginService;
        this.jwtSesionService = jwtSesionService;
        this.sesionService = sesionService;
    }

    @GetMapping("/login")
    public String mostrarLogin(HttpServletRequest request) {
        var perfiles = jwtSesionService.perfiles(request, false);
        if (perfiles.size() == 1) {
            var contexto = sesionService.resolver(perfiles.getFirst());
            if (contexto.isPresent()) {
                return "redirect:" + contexto.get().rutaMenu();
            }
        }
        return "login";
    }

    @PostMapping("/login")
    public String iniciarSesion(@RequestParam String correo,
            @RequestParam String contrasena,
            Model model, HttpServletResponse response) {
        var opciones = loginService.autenticar(correo, contrasena);
        if (opciones.isEmpty()) {
            jwtSesionService.cerrar(response);
            return mostrarCredencialesInvalidas(correo, model);
        }
        if (opciones.size() == 1) {
            jwtSesionService.guardar(response, List.of(perfil(opciones.getFirst())), false);
            return rutaSegunRol(opciones.getFirst());
        }
        model.addAttribute("opciones", opciones);
        jwtSesionService.guardar(response, opciones.stream().map(this::perfil).toList(), true);
        return "seleccionar-rol";
    }

    @PostMapping("/login/rol")
    public String seleccionarRol(@RequestParam String perfil, HttpServletRequest request,
            HttpServletResponse response) {
        if (!jwtSesionService.perfiles(request, true).contains(perfil)) {
            return "redirect:/login";
        }
        var contexto = sesionService.resolver(perfil);
        if (contexto.isEmpty()) {
            jwtSesionService.cerrar(response);
            return "redirect:/login";
        }
        jwtSesionService.guardar(response, List.of(perfil), false);
        return "redirect:" + contexto.get().rutaMenu();
    }

    @PostMapping("/logout")
    public String cerrarSesion(HttpServletResponse response) {
        jwtSesionService.cerrar(response);
        return "redirect:/login";
    }

    private String perfil(UsuarioAutenticado usuario) {
        return usuario.rol().name() + ":" + usuario.perfilId();
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
