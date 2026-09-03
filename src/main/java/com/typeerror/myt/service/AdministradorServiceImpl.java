package com.typeerror.myt.service;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.typeerror.myt.entities.Administrador;
import com.typeerror.myt.repository.AdministradorRepository;

@Service
@Transactional(readOnly = true)
public class AdministradorServiceImpl implements AdministradorService {

    private final AdministradorRepository administradorRepository;

    public AdministradorServiceImpl(AdministradorRepository administradorRepository) {
        this.administradorRepository = administradorRepository;
    }

    @Override
    public Optional<Administrador> findById(Integer id) {
        return administradorRepository.findById(id);
    }

    @Override
    public List<Administrador> findAll() {
        return administradorRepository.findAll();
    }

}
