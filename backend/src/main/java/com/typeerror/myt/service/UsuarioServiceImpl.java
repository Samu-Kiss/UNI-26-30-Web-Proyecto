package com.typeerror.myt.service;

import java.util.List;
import java.util.Optional;

import com.typeerror.myt.errors.UsuarioDeRegistroNoExisteException;
import com.typeerror.myt.errors.UsuarioNotFoundException;
import com.typeerror.myt.errors.UsuarioYaExistenteException;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.typeerror.myt.entities.Usuario;
import com.typeerror.myt.repository.UsuarioRepository;

@Service
public class UsuarioServiceImpl implements UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public UsuarioServiceImpl(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
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
        if (usuario.getId() == null) {
            throw new UsuarioDeRegistroNoExisteException();
        }
        validarCorreoDisponible(usuario);
        Usuario existente = usuarioRepository.findById(usuario.getId())
                .orElseThrow(() -> new UsuarioNotFoundException(usuario.getId()));
        existente.setNombre(usuario.getNombre());
        existente.setApellido(usuario.getApellido());
        existente.setCorreo(usuario.getCorreo());
        existente.setTelefono(usuario.getTelefono());
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
                .orElseThrow(() -> new UsuarioNotFoundException(id));
        usuario.setActivo(activo);
        usuarioRepository.save(usuario);
    }

    private void validarCorreoDisponible(Usuario usuario) {
        usuarioRepository.findByCorreoIgnoreCase(usuario.getCorreo())
                .filter(encontrado -> !encontrado.getId().equals(usuario.getId()))
                .ifPresent(encontrado -> {
                    throw new UsuarioYaExistenteException(usuario.getCorreo());
                });
    }

}
