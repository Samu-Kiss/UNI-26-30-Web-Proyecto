package com.typeerror.myt;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
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

import com.typeerror.myt.entities.Usuario;
import com.typeerror.myt.repository.UsuarioRepository;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ClienteCrudWebTest extends PostgreSqlIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void limpiarUsuarios() {
        usuarioRepository.deleteAll();
    }

    @Test
    void completaElCrudLogicoSinExponerLaContrasena() throws Exception {
        mockMvc.perform(post("/usuarios/guardar")
                        .param("nombre", "Laura")
                        .param("apellido", "Gomez")
                        .param("correo", "laura@myt.test")
                        .param("contrasena", "secreto-inicial")
                        .param("telefono", "3101112233")
                        .param("roles", "ESTUDIANTE"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/usuarios"));

        Usuario creado = usuarioRepository.findByCorreoIgnoreCase("LAURA@MYT.TEST").orElseThrow();
        assertTrue(creado.getActivo());
        assertNotEquals("secreto-inicial", creado.getContrasena());
        assertTrue(passwordEncoder.matches("secreto-inicial", creado.getContrasena()));
        String hashInicial = creado.getContrasena();

        mockMvc.perform(post("/usuarios/{id}/desactivar", creado.getId()))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/usuarios"));

        Usuario desactivado = usuarioRepository.findById(creado.getId()).orElseThrow();
        assertFalse(desactivado.getActivo());
        assertEquals(1, usuarioRepository.count());

        String formulario = mockMvc.perform(get("/usuarios/editar/{id}", creado.getId()))
                .andExpect(status().isOk())
                .andExpect(view().name("usuario-form"))
                .andReturn()
                .getResponse()
                .getContentAsString();
        assertFalse(formulario.contains("secreto-inicial"));

        mockMvc.perform(post("/usuarios/guardar")
                        .param("id", creado.getId().toString())
                        .param("nombre", "Laura Maria")
                        .param("apellido", "Gomez")
                        .param("correo", "laura@myt.test")
                        .param("contrasena", "")
                        .param("telefono", "3101112233")
                        .param("roles", "ESTUDIANTE"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/usuarios"));

        Usuario editado = usuarioRepository.findById(creado.getId()).orElseThrow();
        assertEquals("Laura Maria", editado.getNombre());
        assertEquals(hashInicial, editado.getContrasena());
        assertFalse(editado.getActivo());

        mockMvc.perform(post("/usuarios/{id}/activar", creado.getId()))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/usuarios"));

        assertTrue(usuarioRepository.findById(creado.getId()).orElseThrow().getActivo());
        assertEquals(1, usuarioRepository.count());
    }

    @Test
    void renderizaLosListadosPublicados() throws Exception {
        mockMvc.perform(get("/administradores"))
                .andExpect(status().isOk())
                .andExpect(view().name("administradores"));
        mockMvc.perform(get("/estudiantes"))
                .andExpect(status().isOk())
                .andExpect(view().name("estudiantes"));
        mockMvc.perform(get("/tutores"))
                .andExpect(status().isOk())
                .andExpect(view().name("tutores"));
        mockMvc.perform(get("/reservas"))
                .andExpect(status().isOk())
                .andExpect(view().name("mostrar_reservas"));
    }
}
