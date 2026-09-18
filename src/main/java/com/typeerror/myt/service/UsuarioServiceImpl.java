package com.typeerror.myt.service;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.typeerror.myt.entities.RolUsuario;
import com.typeerror.myt.entities.Usuario;
import com.typeerror.myt.repository.EstudianteRepository;
import com.typeerror.myt.repository.TutorRepository;
import com.typeerror.myt.repository.UsuarioRepository;

@Service
public class UsuarioServiceImpl implements UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final EstudianteRepository estudianteRepository;
    private final TutorRepository tutorRepository;

    public UsuarioServiceImpl(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder,
            EstudianteRepository estudianteRepository, TutorRepository tutorRepository) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.estudianteRepository = estudianteRepository;
        this.tutorRepository = tutorRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Usuario> findById(Integer id) {
        return usuarioRepository.findById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Usuario> findAll() {
        return usuarioRepository.findAll(Sort.by(Sort.Direction.ASC, "id"));
    }

    @Override
    @Transactional
    public Usuario guardar(Usuario usuario) {
        validarCorreoDisponible(usuario);
        if (usuario.getId() == null) {
            usuario.setActivo(true);
            usuario.setContrasena(passwordEncoder.encode(usuario.getContrasena()));
            return usuarioRepository.save(usuario);
        }

        Usuario existente = usuarioRepository.findById(usuario.getId())
                .orElseThrow(() -> new IllegalArgumentException("El usuario no existe"));
        validarPerfilesExistentes(usuario);
        existente.setNombre(usuario.getNombre());
        existente.setApellido(usuario.getApellido());
        existente.setCorreo(usuario.getCorreo());
        existente.setTelefono(usuario.getTelefono());
        existente.setRoles(usuario.getRoles());
        if (usuario.getContrasena() != null && !usuario.getContrasena().isBlank()) {
            existente.setContrasena(passwordEncoder.encode(usuario.getContrasena()));
        }
        return usuarioRepository.save(existente);
    }

    @Override
    @Transactional
    public void desactivar(Integer id) {
        cambiarEstado(id, false);
    }

    @Override
    @Transactional
    public void activar(Integer id) {
        cambiarEstado(id, true);
    }

    private void cambiarEstado(Integer id, boolean activo) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("El usuario no existe"));
        usuario.setActivo(activo);
        usuarioRepository.save(usuario);
    }

    private void validarCorreoDisponible(Usuario usuario) {
        usuarioRepository.findByCorreoIgnoreCase(usuario.getCorreo())
                .filter(encontrado -> !encontrado.getId().equals(usuario.getId()))
                .ifPresent(encontrado -> {
                    throw new IllegalArgumentException("Ya existe un usuario con ese correo");
                });
    }

    private void validarPerfilesExistentes(Usuario usuario) {
        if (estudianteRepository.existsByUsuarioId(usuario.getId())
                && !usuario.getRoles().contains(RolUsuario.ESTUDIANTE)) {
            throw new IllegalArgumentException("No se puede retirar el rol de un perfil estudiante");
        }
        if (tutorRepository.existsByUsuarioId(usuario.getId())
                && !usuario.getRoles().contains(RolUsuario.TUTOR)) {
            throw new IllegalArgumentException("No se puede retirar el rol de un perfil tutor");
        }
    }
}
