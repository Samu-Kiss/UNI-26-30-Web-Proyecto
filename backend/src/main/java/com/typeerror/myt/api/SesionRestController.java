package com.typeerror.myt.api;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import com.typeerror.myt.service.ContextoSesion;
import com.typeerror.myt.service.JwtSesionService;
import com.typeerror.myt.service.LoginService;
import com.typeerror.myt.service.SesionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

@RestController
@RequestMapping("/api/sesion")
public class SesionRestController {
    private final JwtSesionService jwt;
    private final LoginService login;
    private final SesionService sesiones;

    public SesionRestController(JwtSesionService jwt, LoginService login, SesionService sesiones) {
        this.jwt = jwt;
        this.login = login;
        this.sesiones = sesiones;
    }

    public record Credenciales(@NotBlank @Email String correo, @NotBlank String contrasena) { }

    public record Perfil(@NotBlank String perfil) { }

    public record Estado(ContextoSesion actual, List<String> opciones) { }

    @PostMapping("/login")
    public Estado login(@Valid @RequestBody Credenciales datos, HttpServletResponse response) {
        var opciones = login.autenticar(datos.correo(), datos.contrasena()).stream()
                .map(u -> u.rol().name() + ":" + u.perfilId()).toList();
        if (opciones.isEmpty()) {
            jwt.cerrar(response);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Correo o contraseña incorrectos");
        }
        boolean seleccion = opciones.size() > 1;
        jwt.guardar(response, opciones, seleccion);
        return new Estado(seleccion ? null : sesiones.resolver(opciones.getFirst()).orElseThrow(),
                seleccion ? opciones : List.of());
    }

    @GetMapping
    public Estado actual(HttpServletRequest request) {
        var perfiles = jwt.perfiles(request, false);
        if (perfiles.size() == 1) {
            var contexto = sesiones.resolver(perfiles.getFirst());
            if (contexto.isPresent()) {
                return new Estado(contexto.get(), List.of());
            }
        }
        var opciones = jwt.perfiles(request, true).stream()
                .filter(p -> sesiones.resolver(p).isPresent()).toList();
        if (!opciones.isEmpty()) {
            return new Estado(null, opciones);
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "La sesión expiró");
    }

    @PostMapping("/perfil")
    public Estado perfil(@Valid @RequestBody Perfil datos, HttpServletRequest request,
            HttpServletResponse response) {
        if (!jwt.perfiles(request, true).contains(datos.perfil())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Perfil no autorizado");
        }
        var contexto = sesiones.resolver(datos.perfil()).orElseThrow(
                () -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Perfil inactivo"));
        jwt.guardar(response, List.of(datos.perfil()), false);
        return new Estado(contexto, List.of());
    }

    @PostMapping("/logout")
    public void logout(HttpServletResponse response) {
        jwt.cerrar(response);
    }
}
