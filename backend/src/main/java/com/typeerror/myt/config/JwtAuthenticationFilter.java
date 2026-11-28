package com.typeerror.myt.config;

import java.io.IOException;
import java.util.List;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import com.typeerror.myt.entities.RolUsuario;
import com.typeerror.myt.service.ContextoSesion;
import com.typeerror.myt.service.JwtSesionService;
import com.typeerror.myt.service.SesionService;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtSesionService jwtSesionService;
    private final SesionService sesionService;

    public JwtAuthenticationFilter(JwtSesionService jwtSesionService, SesionService sesionService) {
        this.jwtSesionService = jwtSesionService;
        this.sesionService = sesionService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        var perfiles = jwtSesionService.perfiles(request, false);
        var contexto = perfiles.size() == 1
                ? sesionService.resolver(perfiles.getFirst())
                : java.util.Optional.<ContextoSesion>empty();

        if (contexto.isPresent()) {
            ContextoSesion sesion = contexto.get();
            request.setAttribute("apiSesion", sesion);
            var authorities = construirAutoridades(sesion.rol());
            var authentication = new UsernamePasswordAuthenticationToken(
                    sesion, null, authorities);
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContext securityContext = SecurityContextHolder.createEmptyContext();
            securityContext.setAuthentication(authentication);
            SecurityContextHolder.setContext(securityContext);
        }

        filterChain.doFilter(request, response);
    }

    private List<SimpleGrantedAuthority> construirAutoridades(RolUsuario rol) {
        return switch (rol) {
            case ADMINISTRADOR -> List.of(
                    new SimpleGrantedAuthority("ROLE_ADMIN"),
                    new SimpleGrantedAuthority("ROLE_ADMINISTRADOR"));
            case ESTUDIANTE -> List.of(
                    new SimpleGrantedAuthority("ROLE_USER"),
                    new SimpleGrantedAuthority("ROLE_ESTUDIANTE"));
            case TUTOR -> List.of(
                    new SimpleGrantedAuthority("ROLE_USER"),
                    new SimpleGrantedAuthority("ROLE_TUTOR"));
        };
    }
}
