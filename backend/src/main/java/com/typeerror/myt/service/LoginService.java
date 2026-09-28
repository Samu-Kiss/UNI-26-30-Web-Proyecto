package com.typeerror.myt.service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.typeerror.myt.entities.RolUsuario;
import com.typeerror.myt.entities.Usuario;
import com.typeerror.myt.repository.UsuarioRepository;
import com.typeerror.myt.repository.EstudianteRepository;
import com.typeerror.myt.repository.TutorRepository;

@Service
@Transactional(readOnly = true)
public class LoginService {

    private final UsuarioRepository usuarioRepository;
    private final EstudianteRepository estudianteRepository;
    private final TutorRepository tutorRepository;
    private final PasswordEncoder passwordEncoder;

    public LoginService(UsuarioRepository usuarioRepository,
            EstudianteRepository estudianteRepository, TutorRepository tutorRepository,
            PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.estudianteRepository = estudianteRepository;
        this.tutorRepository = tutorRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public List<UsuarioAutenticado> autenticar(String correo, String contrasena) {
        if (correo == null || contrasena == null || correo.isBlank() || contrasena.isBlank()) {
            return List.of();
        }
        return usuarioRepository.findByCorreoIgnoreCase(correo.trim())
                .filter(usuario -> Boolean.TRUE.equals(usuario.getActivo()))
                .filter(usuario -> passwordEncoder.matches(contrasena, usuario.getContrasena()))
                .map(this::resolverPerfiles)
                .orElseGet(List::of);
    }

    private List<UsuarioAutenticado> resolverPerfiles(Usuario usuario) {
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
