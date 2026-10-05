package com.typeerror.myt.config;

import java.io.IOException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import com.typeerror.myt.entities.RolUsuario;
import com.typeerror.myt.service.ContextoSesion;
import com.typeerror.myt.service.SesionService;
import com.typeerror.myt.service.JwtSesionService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class SesionInterceptor implements HandlerInterceptor {

    private static final Pattern RESERVAS_ESTUDIANTE =
            Pattern.compile("/estudiantes/(\\d+)/reservas");
    private static final Pattern RESERVAS_TUTOR =
            Pattern.compile("/tutores/(\\d+)/reservas");
    private static final Pattern RESERVAR_TUTOR =
            Pattern.compile("/tutores/(\\d+)/reservar");

    private final SesionService sesionService;
    private final JwtSesionService jwtSesionService;

    public SesionInterceptor(SesionService sesionService, JwtSesionService jwtSesionService) {
        this.jwtSesionService = jwtSesionService;
        this.sesionService = sesionService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response,
            Object handler) throws IOException {
        var perfiles = jwtSesionService.perfiles(request, false);
        var contexto = sesionService.resolver(perfiles.size() == 1 ? perfiles.getFirst() : null);
        String ruta = request.getRequestURI().substring(request.getContextPath().length());
        if (contexto.isEmpty() || !puedeVisitar(ruta, contexto.get())) {
            response.sendRedirect(request.getContextPath() + "/login");
            return false;
        }
        publicarAtributos(request, contexto.get());
        return true;
    }

    private void publicarAtributos(HttpServletRequest request, ContextoSesion contexto) {
        request.setAttribute("sesion", contexto.valor());
        request.setAttribute("rolSesion", contexto.rol());
        request.setAttribute("perfilIdSesion", contexto.perfilId());
        request.setAttribute("nombreSesion", contexto.nombreUsuario());
        request.setAttribute("rutaMenu", contexto.rutaMenu());
    }

    private boolean puedeVisitar(String ruta, ContextoSesion contexto) {
        if ("/tutores".equals(ruta)) {
            return contexto.rol() == RolUsuario.ADMINISTRADOR
                    || contexto.rol() == RolUsuario.ESTUDIANTE;
        }
        if ("/estudiante".equals(ruta)) {
            return contexto.rol() == RolUsuario.ESTUDIANTE;
        }
        if ("/tutor".equals(ruta)) {
            return contexto.rol() == RolUsuario.TUTOR;
        }
        Matcher reservarTutor = RESERVAR_TUTOR.matcher(ruta);
        if (reservarTutor.matches()) {
            return contexto.rol() == RolUsuario.ESTUDIANTE;
        }
        Matcher estudiante = RESERVAS_ESTUDIANTE.matcher(ruta);
        if (estudiante.matches()) {
            return coincidePerfil(contexto, RolUsuario.ESTUDIANTE, estudiante.group(1));
        }
        Matcher tutor = RESERVAS_TUTOR.matcher(ruta);
        if (tutor.matches()) {
            return coincidePerfil(contexto, RolUsuario.TUTOR, tutor.group(1));
        }
        return contexto.rol() == RolUsuario.ADMINISTRADOR;
    }

    private boolean coincidePerfil(ContextoSesion contexto, RolUsuario rol, String perfilId) {
        return contexto.rol() == rol && contexto.perfilId().equals(Integer.valueOf(perfilId));
    }
}
