package com.typeerror.myt.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.typeerror.myt.entities.Reserva;
import com.typeerror.myt.repository.ReservaRepository;

@Service
public class ReservaServiceImpl implements ReservaService {

    private final ReservaRepository reservaRepository;

    @Autowired
    public ReservaServiceImpl(ReservaRepository reservaRepository) {
        this.reservaRepository = reservaRepository;
    }

    @Override
    public Optional<Reserva> findById(Integer id) {
        return reservaRepository.findById(id);
    }

    @Override
    public List<Reserva> findAll() {
        return reservaRepository.findAll();
    }

}
