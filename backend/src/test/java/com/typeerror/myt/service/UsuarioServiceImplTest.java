package com.typeerror.myt.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.typeerror.myt.entities.RolUsuario;
import com.typeerror.myt.entities.Usuario;
import com.typeerror.myt.errors.UsuarioDeRegistroNoExisteException;
import com.typeerror.myt.errors.UsuarioNotFoundException;
import com.typeerror.myt.errors.UsuarioYaExistenteException;
import com.typeerror.myt.repository.UsuarioRepository;

@ExtendWith(MockitoExtension.class)
class UsuarioServiceImplTest {

    @Mock
    private UsuarioRepository usuarioRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    private UsuarioService servicio;

    @BeforeEach
    void preparar() {
        servicio = new UsuarioServiceImpl(usuarioRepository, passwordEncoder);
    }

    @Test
    void rechazaCrearUsuarioSinPerfil() {
        Usuario usuario = usuario(null, "nuevo@myt.test", Set.of(RolUsuario.ESTUDIANTE));
        assertThrows(UsuarioDeRegistroNoExisteException.class, () -> servicio.guardar(usuario));
    }

    @Test
    void actualizaSinPerderLaContrasenaSiLlegaVacia() {
        Usuario existente = usuario(1, "anterior@myt.test", Set.of(RolUsuario.ESTUDIANTE));
        existente.setContrasena("hash-anterior");
        Usuario cambios = usuario(1, "nuevo@myt.test", Set.of(RolUsuario.ESTUDIANTE));
        cambios.setNombre("Actualizado");
        cambios.setContrasena("");
        cambios.setRoles(Set.of(RolUsuario.ADMINISTRADOR));
        when(usuarioRepository.findByCorreoIgnoreCase(cambios.getCorreo())).thenReturn(Optional.empty());
        when(usuarioRepository.findById(1)).thenReturn(Optional.of(existente));
        when(usuarioRepository.save(existente)).thenReturn(existente);

        Usuario actualizado = servicio.guardar(cambios);

        assertEquals("Actualizado", actualizado.getNombre());
        assertEquals("hash-anterior", actualizado.getContrasena());
        assertEquals(Set.of(RolUsuario.ESTUDIANTE), actualizado.getRoles());
    }

    @Test
    void protegeCorreosUnicos() {
        Usuario encontrado = usuario(2, "duplicado@myt.test", Set.of(RolUsuario.TUTOR));
        Usuario nuevo = usuario(1, "duplicado@myt.test", Set.of(RolUsuario.ESTUDIANTE));
        when(usuarioRepository.findByCorreoIgnoreCase(nuevo.getCorreo()))
                .thenReturn(Optional.of(encontrado));
        assertThrows(UsuarioYaExistenteException.class, () -> servicio.guardar(nuevo));

    }

    @Test
    void consultaYCambiaElEstado() {
        Usuario usuario = usuario(1, "estado@myt.test", Set.of(RolUsuario.TUTOR));
        when(usuarioRepository.findById(1)).thenReturn(Optional.of(usuario));
        when(usuarioRepository.findAll(any(Sort.class))).thenReturn(List.of(usuario));

        assertEquals(usuario, servicio.findById(1).orElseThrow());
        assertEquals(1, servicio.findAll().size());
        servicio.desactivar(1);
        assertFalse(usuario.getActivo());
        servicio.activar(1);
        assertTrue(usuario.getActivo());
    }

    @Test
    void reportaUsuarioInexistenteAlCambiarEstado() {
        when(usuarioRepository.findById(99)).thenReturn(Optional.empty());

        assertThrows(UsuarioNotFoundException.class, () -> servicio.desactivar(99));
    }

    private Usuario usuario(Integer id, String correo, Set<RolUsuario> roles) {
        Usuario usuario = new Usuario();
        usuario.setId(id);
        usuario.setNombre("Nombre");
        usuario.setApellido("Apellido");
        usuario.setCorreo(correo);
        usuario.setContrasena("plana");
        usuario.setTelefono("3000000000");
        usuario.setActivo(true);
        usuario.setRoles(roles);
        return usuario;
    }
}
