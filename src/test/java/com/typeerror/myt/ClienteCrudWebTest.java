package com.typeerror.myt;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.typeerror.myt.entities.Cliente;
import com.typeerror.myt.repository.ClienteRepository;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ClienteCrudWebTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ClienteRepository clienteRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void limpiarClientes() {
        clienteRepository.deleteAll();
    }

    @Test
    void completaElCrudLogicoSinExponerLaContrasena() throws Exception {
        mockMvc.perform(post("/clientes/guardar")
                        .param("nombre", "Laura")
                        .param("apellido", "Gomez")
                        .param("correo", "laura@myt.test")
                        .param("contrasena", "secreto-inicial")
                        .param("telefono", "3101112233"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/clientes"));

        Cliente creado = clienteRepository.findByCorreoIgnoreCase("LAURA@MYT.TEST").orElseThrow();
        assertTrue(creado.getActivo());
        assertFalse("secreto-inicial".equals(creado.getContrasena()));
        assertTrue(passwordEncoder.matches("secreto-inicial", creado.getContrasena()));
        String hashInicial = creado.getContrasena();

        mockMvc.perform(post("/clientes/{id}/desactivar", creado.getId()))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/clientes"));

        Cliente desactivado = clienteRepository.findById(creado.getId()).orElseThrow();
        assertFalse(desactivado.getActivo());
        assertEquals(1, clienteRepository.count());

        String formulario = mockMvc.perform(get("/clientes/editar/{id}", creado.getId()))
                .andExpect(status().isOk())
                .andExpect(view().name("cliente-form"))
                .andReturn()
                .getResponse()
                .getContentAsString();
        assertFalse(formulario.contains("secreto-inicial"));

        mockMvc.perform(post("/clientes/guardar")
                        .param("id", creado.getId().toString())
                        .param("nombre", "Laura Maria")
                        .param("apellido", "Gomez")
                        .param("correo", "laura@myt.test")
                        .param("contrasena", "")
                        .param("telefono", "3101112233"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/clientes"));

        Cliente editado = clienteRepository.findById(creado.getId()).orElseThrow();
        assertEquals("Laura Maria", editado.getNombre());
        assertEquals(hashInicial, editado.getContrasena());
        assertFalse(editado.getActivo());

        mockMvc.perform(post("/clientes/{id}/activar", creado.getId()))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/clientes"));

        assertTrue(clienteRepository.findById(creado.getId()).orElseThrow().getActivo());
        assertEquals(1, clienteRepository.count());
    }
}
