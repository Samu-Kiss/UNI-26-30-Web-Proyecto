package com.typeerror.myt.service;

import java.util.Optional;

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

    public Optional<UsuarioAutenticado> autenticar(String correo, String contrasena) {
        if (correo == null || contrasena == null || correo.isBlank() || contrasena.isBlank()) {
            return Optional.empty();
        }
        return usuarioRepository.findByCorreoIgnoreCase(correo.trim())
                .filter(usuario -> Boolean.TRUE.equals(usuario.getActivo()))
                .filter(usuario -> passwordEncoder.matches(contrasena, usuario.getContrasena()))
                .flatMap(this::resolverPerfil);
    }

    private Optional<UsuarioAutenticado> resolverPerfil(Usuario usuario) {
        if (usuario.getRoles().contains(RolUsuario.ADMINISTRADOR)) {
            return Optional.of(new UsuarioAutenticado(RolUsuario.ADMINISTRADOR, usuario.getId()));
        }
        if (usuario.getRoles().contains(RolUsuario.ESTUDIANTE)) {
            var estudiante = estudianteRepository.findByUsuarioId(usuario.getId());
            if (estudiante.isPresent()) {
                return Optional.of(new UsuarioAutenticado(RolUsuario.ESTUDIANTE, estudiante.get().getId()));
            }
        }
        if (usuario.getRoles().contains(RolUsuario.TUTOR)) {
            return tutorRepository.findByUsuarioId(usuario.getId())
                    .map(tutor -> new UsuarioAutenticado(RolUsuario.TUTOR, tutor.getId()));
        }
        return Optional.empty();
    }
}
