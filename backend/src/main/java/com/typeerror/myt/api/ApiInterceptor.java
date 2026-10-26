package com.typeerror.myt.api;

import java.io.IOException;
import java.util.Set;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import com.typeerror.myt.service.JwtSesionService;
import com.typeerror.myt.service.SesionService;
import com.typeerror.myt.entities.RolUsuario;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class ApiInterceptor implements HandlerInterceptor {
    private final JwtSesionService jwt;
    private final SesionService sesiones;

    public ApiInterceptor(JwtSesionService jwt, SesionService sesiones) {
        this.jwt = jwt;
        this.sesiones = sesiones;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws IOException {
        String method = request.getMethod();
        if ("OPTIONS".equals(method)) {
            return true;
        }
        // A custom header forces a CORS preflight; only the configured SPA origin may send it.
        if (!Set.of("GET", "HEAD").contains(method)
                && !"1".equals(request.getHeader("X-MYT-Request"))) {
            return error(response, 403, "Falta protección CSRF");
        }
        if (request.getRequestURI().startsWith("/api/sesion")) {
            return true;
        }
        var perfiles = jwt.perfiles(request, false);
        var contexto = perfiles.size() == 1 ? sesiones.resolver(perfiles.getFirst()) : java.util.Optional
                .<com.typeerror.myt.service.ContextoSesion>empty();
        if (contexto.isEmpty()) {
            return error(response, 401, "Inicia sesión de nuevo");
        }
        if (request.getRequestURI().startsWith("/api/usuarios")
                && contexto.get().rol() != RolUsuario.ADMINISTRADOR) {
            return error(response, 403, "Se requiere perfil administrador");
        }
        request.setAttribute("apiSesion", contexto.get());
        return true;
    }

    private boolean error(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"mensaje\":\"" + message + "\"}");
        return false;
    }
}
