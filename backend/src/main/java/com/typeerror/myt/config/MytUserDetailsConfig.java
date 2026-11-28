package com.typeerror.myt.config;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;

import com.typeerror.myt.entities.RolUsuario;
import com.typeerror.myt.entities.Usuario;
import com.typeerror.myt.repository.UsuarioRepository;

@Configuration
public class MytUserDetailsConfig {

    public static final String CLAVE_PRUEBA_INMEMORY = "1ManzanaGrande!";
    public static final String USER_ESTUDIANTE_EMAIL = "user1@myt.edu.co";
    public static final String USER_TUTOR_EMAIL = "user2@myt.edu.co";
    public static final String ADMIN_EMAIL = "admin@myt.edu.co";
    private static final String ROLE_USER = "ROLE_USER";

    @Bean
    public InMemoryUserDetailsManager inMemoryUserDetailsManager(PasswordEncoder passwordEncoder) {
        String hash = passwordEncoder.encode(CLAVE_PRUEBA_INMEMORY);

        UserDetails usuarioNormal1 = User.withUsername(USER_ESTUDIANTE_EMAIL)
                .password(hash)
                .roles("USER", "ESTUDIANTE")
                .build();

        UserDetails usuarioNormal2 = User.withUsername(USER_TUTOR_EMAIL)
                .password(hash)
                .roles("USER", "TUTOR")
                .build();

        UserDetails administrador = User.withUsername(ADMIN_EMAIL)
                .password(hash)
                .roles("ADMIN", "ADMINISTRADOR")
                .build();

        return new InMemoryUserDetailsManager(usuarioNormal1, usuarioNormal2, administrador);
    }

    @Bean
    @Primary
    public UserDetailsService userDetailsService(
            UsuarioRepository usuarioRepository,
            InMemoryUserDetailsManager inMemoryUserDetailsManager) {
        return username -> {
            if (username == null || username.isBlank()) {
                throw new UsernameNotFoundException("El correo del usuario es obligatorio");
            }
            String correoLimpio = username.trim();
            return usuarioRepository.findByCorreoIgnoreCase(correoLimpio)
                    .map(this::mapearUsuarioJpa)
                    .orElseGet(() -> {
                        String normalizado = correoLimpio.toLowerCase(Locale.ROOT);
                        if (inMemoryUserDetailsManager != null
                                && inMemoryUserDetailsManager.userExists(normalizado)) {
                            return inMemoryUserDetailsManager.loadUserByUsername(normalizado);
                        }
                        throw new UsernameNotFoundException(
                                "No se encontró el usuario: " + correoLimpio);
                    });
        };
    }

    private UserDetails mapearUsuarioJpa(Usuario usuario) {
        List<GrantedAuthority> authorities = new ArrayList<>();
        if (usuario.getRoles().contains(RolUsuario.ADMINISTRADOR)) {
            authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
            authorities.add(new SimpleGrantedAuthority("ROLE_ADMINISTRADOR"));
        }
        if (usuario.getRoles().contains(RolUsuario.ESTUDIANTE)) {
            authorities.add(new SimpleGrantedAuthority(ROLE_USER));
            authorities.add(new SimpleGrantedAuthority("ROLE_ESTUDIANTE"));
        }
        if (usuario.getRoles().contains(RolUsuario.TUTOR)) {
            authorities.add(new SimpleGrantedAuthority(ROLE_USER));
            authorities.add(new SimpleGrantedAuthority("ROLE_TUTOR"));
        }
        if (authorities.isEmpty()) {
            authorities.add(new SimpleGrantedAuthority(ROLE_USER));
        }
        return User.withUsername(usuario.getCorreo())
                .password(usuario.getContrasena())
                .disabled(!Boolean.TRUE.equals(usuario.getActivo()))
                .authorities(authorities)
                .build();
    }
}
