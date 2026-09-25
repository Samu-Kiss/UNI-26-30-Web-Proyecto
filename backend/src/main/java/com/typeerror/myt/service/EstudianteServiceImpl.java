package com.typeerror.myt.service;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.typeerror.myt.entities.Estudiante;
import com.typeerror.myt.repository.EstudianteRepository;

@Service
@Transactional(readOnly = true)
public class EstudianteServiceImpl implements EstudianteService {

    private final EstudianteRepository estudianteRepository;

    public EstudianteServiceImpl(EstudianteRepository estudianteRepository) {
        this.estudianteRepository = estudianteRepository;
    }

    @Override
    public Optional<Estudiante> findById(Integer id) {
        return estudianteRepository.findOneById(id);
    }

    @Override
    public List<Estudiante> findAll() {
        return estudianteRepository.findAll();
    }

}
