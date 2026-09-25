package com.typeerror.myt.service;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.typeerror.myt.entities.RolUsuario;
import com.typeerror.myt.entities.Usuario;
import com.typeerror.myt.repository.UsuarioRepository;

@Service
@Transactional(readOnly = true)
public class AdministradorServiceImpl implements AdministradorService {

    private final UsuarioRepository usuarioRepository;

    public AdministradorServiceImpl(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    public Optional<Usuario> findById(Integer id) {
        return usuarioRepository.findById(id)
                .filter(usuario -> usuario.getRoles().contains(RolUsuario.ADMINISTRADOR));
    }

    @Override
    public List<Usuario> findAll() {
        return usuarioRepository.findDistinctByRolesContainingOrderByIdAsc(RolUsuario.ADMINISTRADOR);
    }

}
