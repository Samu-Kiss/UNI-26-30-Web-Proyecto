package com.typeerror.myt.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import com.typeerror.myt.entities.Cliente;

@DataJpaTest
class ClienteRepositoryTest {

    @Autowired
    private ClienteRepository clienteRepository;

    @Test
    void persisteYActualizaElEstadoSinEliminarLaFila() {
        Cliente cliente = new Cliente(null, "Laura", "Gomez", "laura@myt.test",
                "secreto", "3101112233", true);

        Cliente guardado = clienteRepository.saveAndFlush(cliente);
        assertNotNull(guardado.getId());

        guardado.setActivo(false);
        clienteRepository.saveAndFlush(guardado);

        Cliente desactivado = clienteRepository.findById(guardado.getId()).orElseThrow();
        assertFalse(desactivado.getActivo());
        assertEquals(1, clienteRepository.count());

        desactivado.setActivo(true);
        clienteRepository.saveAndFlush(desactivado);

        assertTrue(clienteRepository.findById(guardado.getId()).orElseThrow().getActivo());
        assertEquals(1, clienteRepository.count());
    }
}
