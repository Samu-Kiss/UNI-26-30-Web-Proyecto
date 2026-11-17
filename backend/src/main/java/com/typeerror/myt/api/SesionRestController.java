package com.typeerror.myt.api;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.typeerror.myt.service.ContextoSesion;
import com.typeerror.myt.service.GoogleAuthService;
import com.typeerror.myt.service.JwtSesionService;
import com.typeerror.myt.service.LoginService;
import com.typeerror.myt.service.PasswordRecoveryService;
import com.typeerror.myt.service.SesionService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@RestController
@Tag(name = "Sesión", description = "Autenticación mediante cookie HttpOnly conservada por el navegador")
@RequestMapping("/api/sesion")
public class SesionRestController {

    private final JwtSesionService jwt;
    private final LoginService login;
    private final SesionService sesiones;
    private final PasswordRecoveryService passwordRecovery;
    private final GoogleAuthService googleAuth;

    public SesionRestController(JwtSesionService jwt, LoginService login, SesionService sesiones) {
        this(jwt, login, sesiones, null, null);
    }

    @Autowired
    public SesionRestController(
            JwtSesionService jwt,
            LoginService login,
            SesionService sesiones,
            PasswordRecoveryService passwordRecovery,
            GoogleAuthService googleAuth) {
        this.jwt = jwt;
        this.login = login;
        this.sesiones = sesiones;
        this.passwordRecovery = passwordRecovery;
        this.googleAuth = googleAuth;
    }

    public record Credenciales(@NotBlank @Email String correo, @NotBlank String contrasena) { }

    public record CredencialesGoogle(String correo, String nombre, String credencial) { }

    public record SolicitudRecuperacion(@NotBlank @Email String correo) { }

    public record RestablecerContrasena(
            @NotBlank String token,
            @NotBlank @Size(min = 8, max = 72) String nuevaContrasena) { }

    public record Perfil(@NotBlank String perfil) { }

    public record Estado(ContextoSesion actual, List<String> opciones) { }

    @PostMapping("/login")
    @Operation(summary = "Iniciar sesión", description = "Usa una cuenta de prueba existente. "
            + "Si opciones contiene varios perfiles, elige uno mediante POST /api/sesion/perfil.")
    @ApiResponse(responseCode = "200", description = "Cookie de sesión emitida")
    @ApiResponse(responseCode = "401", description = "Credenciales incorrectas")
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

    @PostMapping("/google")
    @Operation(summary = "Iniciar sesión con Google",
            description = "Autentica con Google Identity Services o correo verificado de Google.")
    @ApiResponse(responseCode = "200", description = "Sesión autenticada con Google")
    public Estado loginGoogle(@RequestBody CredencialesGoogle datos, HttpServletResponse response) {
        if (googleAuth == null) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Autenticación con Google no disponible");
        }
        var opciones = googleAuth.autenticarConGoogle(
                datos.correo(), datos.nombre(), datos.credencial()).stream()
                .map(u -> u.rol().name() + ":" + u.perfilId()).toList();
        if (opciones.isEmpty()) {
            jwt.cerrar(response);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "No fue posible autenticar con Google");
        }
        boolean seleccion = opciones.size() > 1;
        jwt.guardar(response, opciones, seleccion);
        return new Estado(seleccion ? null : sesiones.resolver(opciones.getFirst()).orElseThrow(),
                seleccion ? opciones : List.of());
    }

    @PostMapping("/recuperar")
    @Operation(summary = "Solicitar código de recuperación de contraseña")
    @ApiResponse(responseCode = "200", description = "Código de recuperación generado")
    public PasswordRecoveryService.SolicitudRecuperacionDto solicitarRecuperacion(
            @Valid @RequestBody SolicitudRecuperacion datos) {
        if (passwordRecovery == null) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Servicio de recuperación no disponible");
        }
        return passwordRecovery.solicitarRecuperacion(datos.correo());
    }

    @PostMapping("/restablecer")
    @Operation(summary = "Restablecer contraseña mediante código de recuperación")
    @ApiResponse(responseCode = "200", description = "Contraseña actualizada con BCrypt")
    public Map<String, String> restablecerContrasena(
            @Valid @RequestBody RestablecerContrasena datos) {
        if (passwordRecovery == null) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Servicio de recuperación no disponible");
        }
        passwordRecovery.restablecerContrasena(datos.token(), datos.nuevaContrasena());
        return Map.of("mensaje", "Contraseña actualizada correctamente. Ya puedes iniciar sesión.");
    }

    @GetMapping
    @Operation(summary = "Consultar sesión actual")
    @ApiResponse(responseCode = "200", description = "Sesión activa u opciones de perfil pendientes")
    @ApiResponse(responseCode = "401", description = "Sesión ausente o vencida")
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
    @Operation(summary = "Seleccionar perfil autenticado")
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
    @Operation(summary = "Cerrar sesión")
    public void logout(HttpServletResponse response) {
        jwt.cerrar(response);
    }
}
