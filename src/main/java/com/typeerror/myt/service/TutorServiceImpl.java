package com.typeerror.myt.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.typeerror.myt.entities.Tutor;
import com.typeerror.myt.repository.TutorRepository;

@Service
public class TutorServiceImpl implements TutorService {

    private final TutorRepository tutorRepository;

    @Autowired
    public TutorServiceImpl(TutorRepository tutorRepository) {
        this.tutorRepository = tutorRepository;
    }

    @Override
    public Optional<Tutor> findById(Integer id) {
        return tutorRepository.findById(id);
    }

    @Override
    public List<Tutor> findAll() {
        return tutorRepository.findAll();
    }

}
