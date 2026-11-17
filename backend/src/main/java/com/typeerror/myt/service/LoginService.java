package com.typeerror.myt.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.typeerror.myt.config.MytUserDetailsConfig;
import com.typeerror.myt.entities.Estudiante;
import com.typeerror.myt.entities.RolUsuario;
import com.typeerror.myt.entities.Tutor;
import com.typeerror.myt.entities.Usuario;
import com.typeerror.myt.repository.EstudianteRepository;
import com.typeerror.myt.repository.TutorRepository;
import com.typeerror.myt.repository.UsuarioRepository;

@Service
@Transactional
public class LoginService {

    private final UsuarioRepository usuarioRepository;
    private final EstudianteRepository estudianteRepository;
    private final TutorRepository tutorRepository;
    private final PasswordEncoder passwordEncoder;
    private final InMemoryUserDetailsManager inMemoryUserDetailsManager;
    private final UserDetailsService userDetailsService;

    public LoginService(UsuarioRepository usuarioRepository,
            EstudianteRepository estudianteRepository, TutorRepository tutorRepository,
            PasswordEncoder passwordEncoder) {
        this(usuarioRepository, estudianteRepository, tutorRepository, passwordEncoder, null, null);
    }

    public LoginService(UsuarioRepository usuarioRepository,
            EstudianteRepository estudianteRepository, TutorRepository tutorRepository,
            PasswordEncoder passwordEncoder,
            InMemoryUserDetailsManager inMemoryUserDetailsManager) {
        this(usuarioRepository, estudianteRepository, tutorRepository,
                passwordEncoder, inMemoryUserDetailsManager, null);
    }

    @Autowired
    public LoginService(UsuarioRepository usuarioRepository,
            EstudianteRepository estudianteRepository, TutorRepository tutorRepository,
            PasswordEncoder passwordEncoder,
            InMemoryUserDetailsManager inMemoryUserDetailsManager,
            UserDetailsService userDetailsService) {
        this.usuarioRepository = usuarioRepository;
        this.estudianteRepository = estudianteRepository;
        this.tutorRepository = tutorRepository;
        this.passwordEncoder = passwordEncoder;
        this.inMemoryUserDetailsManager = inMemoryUserDetailsManager;
        this.userDetailsService = userDetailsService != null
                ? userDetailsService
                : new MytUserDetailsConfig().userDetailsService(
                        usuarioRepository, inMemoryUserDetailsManager);
    }

    public List<UsuarioAutenticado> autenticar(String correo, String contrasena) {
        if (correo == null || contrasena == null || correo.isBlank() || contrasena.isBlank()) {
            return List.of();
        }
        String correoLimpio = correo.trim();
        UserDetails detalles;
        try {
            detalles = userDetailsService.loadUserByUsername(correoLimpio);
        } catch (UsernameNotFoundException ex) {
            return List.of();
        }
        if (!passwordEncoder.matches(contrasena, detalles.getPassword())) {
            return List.of();
        }
        if (!detalles.isEnabled()) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Tu cuenta está desactivada. Comunícate con soporte para revisar tu perfil.");
        }
        Usuario usuario = usuarioRepository.findByCorreoIgnoreCase(correoLimpio)
                .orElseGet(() -> sincronizarUsuarioEnMemoria(
                        correoLimpio.toLowerCase(Locale.ROOT), detalles));
        return resolverPerfiles(usuario);
    }

    public Optional<Usuario> asegurarUsuario(String correo) {
        if (correo == null || correo.isBlank()) {
            return Optional.empty();
        }
        String correoLimpio = correo.trim();
        var existente = usuarioRepository.findByCorreoIgnoreCase(correoLimpio);
        if (existente.isPresent()) {
            return existente;
        }
        String correoLower = correoLimpio.toLowerCase(Locale.ROOT);
        if (inMemoryUserDetailsManager != null && inMemoryUserDetailsManager.userExists(correoLower)) {
            UserDetails detalles = inMemoryUserDetailsManager.loadUserByUsername(correoLower);
            return Optional.of(sincronizarUsuarioEnMemoria(correoLower, detalles));
        }
        return Optional.empty();
    }

    private Usuario sincronizarUsuarioEnMemoria(String correoLower, UserDetails detalles) {
        Set<String> autoridades = detalles.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(java.util.stream.Collectors.toSet());

        Set<RolUsuario> roles = new HashSet<>();
        String nombre;
        String apellido;
        if (autoridades.contains("ROLE_ADMIN") || autoridades.contains("ROLE_ADMINISTRADOR")) {
            roles.add(RolUsuario.ADMINISTRADOR);
            nombre = "Administrador";
            apellido = "MyT";
        } else if (autoridades.contains("ROLE_TUTOR")) {
            roles.add(RolUsuario.TUTOR);
            nombre = "Carlos";
            apellido = "Tutor";
        } else {
            roles.add(RolUsuario.ESTUDIANTE);
            nombre = "Sofía";
            apellido = "Estudiante";
        }

        Usuario nuevo = new Usuario();
        nuevo.setNombre(nombre);
        nuevo.setApellido(apellido);
        nuevo.setCorreo(correoLower);
        nuevo.setContrasena(detalles.getPassword());
        nuevo.setActivo(true);
        nuevo.setRoles(roles);
        Usuario guardado = usuarioRepository.save(nuevo);

        if (roles.contains(RolUsuario.ESTUDIANTE)) {
            estudianteRepository.save(new Estudiante(
                    null, guardado, "INMEM-" + guardado.getId(),
                    "Pontificia Universidad Javeriana", "Ingeniería de Sistemas", 5));
        }
        if (roles.contains(RolUsuario.TUTOR)) {
            tutorRepository.save(new Tutor(
                    null, guardado,
                    "Tutor verificado de arquitectura web y programación en Spring Boot.",
                    Set.of(), new BigDecimal("45000"), true));
        }
        return guardado;
    }

    public List<UsuarioAutenticado> resolverPerfiles(Usuario usuario) {
        List<UsuarioAutenticado> accesos = new ArrayList<>();
        if (usuario.getRoles().contains(RolUsuario.ADMINISTRADOR)) {
            accesos.add(new UsuarioAutenticado(RolUsuario.ADMINISTRADOR, usuario.getId()));
        }
        if (usuario.getRoles().contains(RolUsuario.ESTUDIANTE)) {
            estudianteRepository.findByUsuarioId(usuario.getId())
                    .ifPresent(estudiante -> accesos.add(
                            new UsuarioAutenticado(RolUsuario.ESTUDIANTE, estudiante.getId())));
        }
        if (usuario.getRoles().contains(RolUsuario.TUTOR)) {
            tutorRepository.findByUsuarioId(usuario.getId())
                    .ifPresent(tutor -> accesos.add(
                            new UsuarioAutenticado(RolUsuario.TUTOR, tutor.getId())));
        }
        return List.copyOf(accesos);
    }
}
