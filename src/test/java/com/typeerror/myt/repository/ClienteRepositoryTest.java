package com.typeerror.myt.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import com.typeerror.myt.PostgreSqlIntegrationTest;
import java.util.Set;

import com.typeerror.myt.entities.RolUsuario;
import com.typeerror.myt.entities.Usuario;

@DataJpaTest
class ClienteRepositoryTest extends PostgreSqlIntegrationTest {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Test
    void persisteYActualizaElEstadoSinEliminarLaFila() {
        Usuario usuario = new Usuario();
        usuario.setNombre("Laura");
        usuario.setApellido("Gomez");
        usuario.setCorreo("laura@myt.test");
        usuario.setContrasena("secreto");
        usuario.setTelefono("3101112233");
        usuario.setRoles(Set.of(RolUsuario.ESTUDIANTE));

        Usuario guardado = usuarioRepository.saveAndFlush(usuario);
        assertNotNull(guardado.getId());

        guardado.setActivo(false);
        usuarioRepository.saveAndFlush(guardado);

        Usuario desactivado = usuarioRepository.findById(guardado.getId()).orElseThrow();
        assertFalse(desactivado.getActivo());
        assertEquals(1, usuarioRepository.count());

        desactivado.setActivo(true);
        usuarioRepository.saveAndFlush(desactivado);

        assertTrue(usuarioRepository.findById(guardado.getId()).orElseThrow().getActivo());
        assertEquals(1, usuarioRepository.count());
    }
}
