package com.typeerror.myt.service;

import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.typeerror.myt.entities.RolUsuario;
import com.typeerror.myt.entities.Usuario;
import com.typeerror.myt.repository.EstudianteRepository;
import com.typeerror.myt.repository.TutorRepository;
import com.typeerror.myt.repository.UsuarioRepository;

@Service
@Transactional(readOnly = true)
public class SesionService {

    private final UsuarioRepository usuarioRepository;
    private final EstudianteRepository estudianteRepository;
    private final TutorRepository tutorRepository;

    public SesionService(UsuarioRepository usuarioRepository,
            EstudianteRepository estudianteRepository, TutorRepository tutorRepository) {
        this.usuarioRepository = usuarioRepository;
        this.estudianteRepository = estudianteRepository;
        this.tutorRepository = tutorRepository;
    }

    public Optional<ContextoSesion> resolver(String valor) {
        if (valor == null || valor.isBlank()) {
            return Optional.empty();
        }
        String[] partes = valor.split(":", -1);
        if (partes.length != 2) {
            return Optional.empty();
        }
        try {
            RolUsuario rol = RolUsuario.valueOf(partes[0]);
            Integer perfilId = Integer.valueOf(partes[1]);
            if (perfilId <= 0) {
                return Optional.empty();
            }
            return resolverPerfil(rol, perfilId);
        } catch (IllegalArgumentException exception) {
            return Optional.empty();
        }
    }

    private Optional<ContextoSesion> resolverPerfil(RolUsuario rol, Integer perfilId) {
        return switch (rol) {
            case ADMINISTRADOR -> usuarioRepository.findById(perfilId)
                    .filter(usuario -> usuario.getRoles().contains(RolUsuario.ADMINISTRADOR))
                    .filter(this::estaActivo)
                    .map(usuario -> crearContexto(rol, perfilId, usuario));
            case ESTUDIANTE -> estudianteRepository.findOneById(perfilId)
                    .filter(estudiante -> estaActivo(estudiante.getUsuario()))
                    .filter(estudiante -> estudiante.getUsuario().getRoles()
                            .contains(RolUsuario.ESTUDIANTE))
                    .map(estudiante -> crearContexto(rol, perfilId, estudiante.getUsuario()));
            case TUTOR -> tutorRepository.findOneById(perfilId)
                    .filter(tutor -> estaActivo(tutor.getUsuario()))
                    .filter(tutor -> tutor.getUsuario().getRoles().contains(RolUsuario.TUTOR))
                    .map(tutor -> crearContexto(rol, perfilId, tutor.getUsuario()));
        };
    }

    private ContextoSesion crearContexto(RolUsuario rol, Integer perfilId, Usuario usuario) {
        return new ContextoSesion(rol, perfilId,
                usuario.getNombre() + " " + usuario.getApellido());
    }

    private boolean estaActivo(Usuario usuario) {
        return Boolean.TRUE.equals(usuario.getActivo());
    }
}
