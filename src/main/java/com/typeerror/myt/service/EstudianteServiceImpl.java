package com.typeerror.myt.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.typeerror.myt.entities.Estudiante;
import com.typeerror.myt.repository.EstudianteRepository;

@Service
public class EstudianteServiceImpl implements EstudianteService {

    private final EstudianteRepository estudianteRepository;

    @Autowired
    public EstudianteServiceImpl(EstudianteRepository estudianteRepository) {
        this.estudianteRepository = estudianteRepository;
    }

    @Override
    public Optional<Estudiante> findById(Integer id) {
        return estudianteRepository.findById(id);
    }

    @Override
    public List<Estudiante> findAll() {
        return estudianteRepository.findAll();
    }

}
