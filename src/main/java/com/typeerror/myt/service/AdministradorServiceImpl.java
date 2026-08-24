package com.typeerror.myt.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.typeerror.myt.entities.Administrador;
import com.typeerror.myt.repository.AdministradorRepository;

@Service
public class AdministradorServiceImpl implements AdministradorService {

    private final AdministradorRepository administradorRepository;

    @Autowired
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
