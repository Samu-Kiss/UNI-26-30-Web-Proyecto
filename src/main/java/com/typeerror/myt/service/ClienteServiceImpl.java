package com.typeerror.myt.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.typeerror.myt.entities.Cliente;
import com.typeerror.myt.repository.ClienteRepository;

@Service
public class ClienteServiceImpl implements ClienteService {

    private final ClienteRepository clienteRepository;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public ClienteServiceImpl(ClienteRepository clienteRepository, PasswordEncoder passwordEncoder) {
        this.clienteRepository = clienteRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Cliente> findById(Integer id) {
        return clienteRepository.findById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Cliente> findAll() {
        return clienteRepository.findAll(Sort.by(Sort.Direction.ASC, "id"));
    }

    @Override
    @Transactional
    public Cliente guardar(Cliente cliente) {
        validarCorreoDisponible(cliente);

        if (cliente.getId() == null) {
            cliente.setActivo(true);
            cliente.setContrasena(passwordEncoder.encode(cliente.getContrasena()));
            return clienteRepository.save(cliente);
        }

        Cliente existente = clienteRepository.findById(cliente.getId())
                .orElseThrow(() -> new IllegalArgumentException("El cliente no existe"));
        existente.setNombre(cliente.getNombre());
        existente.setApellido(cliente.getApellido());
        existente.setCorreo(cliente.getCorreo());
        if (cliente.getContrasena() != null && !cliente.getContrasena().isBlank()) {
            existente.setContrasena(passwordEncoder.encode(cliente.getContrasena()));
        }
        existente.setTelefono(cliente.getTelefono());
        return clienteRepository.save(existente);
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
        clienteRepository.findById(id).ifPresent(cliente -> {
            cliente.setActivo(activo);
            clienteRepository.save(cliente);
        });
    }

    private void validarCorreoDisponible(Cliente cliente) {
        clienteRepository.findByCorreoIgnoreCase(cliente.getCorreo())
                .filter(encontrado -> !encontrado.getId().equals(cliente.getId()))
                .ifPresent(encontrado -> {
                    throw new IllegalArgumentException("Ya existe un cliente con ese correo");
                });
    }

}
