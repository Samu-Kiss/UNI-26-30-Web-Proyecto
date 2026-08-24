package com.typeerror.myt.service;

import java.util.List;
import java.util.Optional;

import com.typeerror.myt.entities.Tutor;

public interface TutorService {

    Optional<Tutor> findById(Integer id);

    List<Tutor> findAll();

}
