package com.typeerror.myt.config;

import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.typeerror.myt.service.JwtSesionService;
import com.typeerror.myt.service.SesionService;

import jakarta.servlet.http.HttpServletResponse;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private static final String ROLE_ADMIN = "ADMIN";
    private static final String DEFAULT_FRONTEND_ORIGIN = "http://localhost:4200";

    private final JwtSesionService jwtSesionService;
    private final SesionService sesionService;
    private final String frontendUrl;

    public SecurityConfig(JwtSesionService jwtSesionService, SesionService sesionService) {
        this(jwtSesionService, sesionService, DEFAULT_FRONTEND_ORIGIN);
    }

    @Autowired
    public SecurityConfig(
            JwtSesionService jwtSesionService,
            SesionService sesionService,
            @Value("${FRONTEND_URL:http://localhost:4200}") String frontendUrl) {
        this.jwtSesionService = jwtSesionService;
        this.sesionService = sesionService;
        this.frontendUrl = frontendUrl;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        JwtAuthenticationFilter jwtAuthenticationFilter =
                new JwtAuthenticationFilter(jwtSesionService, sesionService);

        http
                .cors(Customizer.withDefaults())
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/salud").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/pagos/webhook").permitAll()
                        .requestMatchers("/api/public/**").permitAll()
                        .requestMatchers("/api/sesion/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/usuarios").permitAll()
                        .requestMatchers("/swagger-ui/**", "/swagger-ui.html",
                                "/v3/api-docs/**", "/v3/api-docs.yaml").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/tutores").hasRole(ROLE_ADMIN)
                        .requestMatchers("/api/usuarios/**").hasRole(ROLE_ADMIN)
                        .requestMatchers("/api/estudiantes/**").hasRole(ROLE_ADMIN)
                        .requestMatchers("/api/tutores/**", "/api/reservas/**",
                                "/api/perfil/**", "/api/resenas/**", "/api/chat/**",
                                "/api/pagos/**")
                        .hasAnyRole("USER", ROLE_ADMIN)
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().permitAll())
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, authException) ->
                                escribirErrorJson(response, HttpServletResponse.SC_UNAUTHORIZED,
                                        "Inicia sesión de nuevo"))
                        .accessDeniedHandler((request, response, accessDeniedException) ->
                                escribirErrorJson(response, HttpServletResponse.SC_FORBIDDEN,
                                        "Se requiere perfil administrador o permisos suficientes")))
                .addFilterBefore(jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(resolverOrigenesPermitidos(frontendUrl));
        config.setAllowedOriginPatterns(resolverPatronesOrigenPermitidos(frontendUrl));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Content-Type", "X-MYT-Request", "X-XSRF-TOKEN"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }

    public static List<String> resolverOrigenesPermitidos(String frontendOrigin) {
        Set<String> origenes = new LinkedHashSet<>();
        origenes.add(DEFAULT_FRONTEND_ORIGIN);
        if (frontendOrigin != null && !frontendOrigin.isBlank()) {
            for (String parte : frontendOrigin.split(",")) {
                String limpio = quitarBarrasFinales(parte.trim());
                if (!limpio.isEmpty()) {
                    origenes.add(limpio);
                }
            }
        }
        return new ArrayList<>(origenes);
    }

    private static String quitarBarrasFinales(String valor) {
        int fin = valor.length();
        while (fin > 0 && valor.charAt(fin - 1) == '/') {
            fin--;
        }
        return valor.substring(0, fin);
    }

    public static List<String> resolverPatronesOrigenPermitidos(String frontendOrigin) {
        Set<String> patrones = new LinkedHashSet<>(resolverOrigenesPermitidos(frontendOrigin));
        patrones.add("https://*.vercel.app");
        patrones.add("https://*.onrender.com");
        return new ArrayList<>(patrones);
    }

    private void escribirErrorJson(HttpServletResponse response, int status, String mensaje)
            throws IOException {
        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"mensaje\":\"" + mensaje + "\"}");
    }
}
