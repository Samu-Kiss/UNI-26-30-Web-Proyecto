package com.typeerror.myt.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
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
import com.typeerror.myt.repository.EstudianteRepository;
import com.typeerror.myt.repository.TutorRepository;
import com.typeerror.myt.repository.UsuarioRepository;

@ExtendWith(MockitoExtension.class)
class UsuarioServiceImplTest {

    @Mock
    private UsuarioRepository usuarioRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private EstudianteRepository estudianteRepository;
    @Mock
    private TutorRepository tutorRepository;

    private UsuarioService servicio;

    @BeforeEach
    void preparar() {
        servicio = new UsuarioServiceImpl(usuarioRepository, passwordEncoder,
                estudianteRepository, tutorRepository);
    }

    @Test
    void creaUsuarioConContrasenaCodificada() {
        Usuario usuario = usuario(null, "nuevo@myt.test", Set.of(RolUsuario.ESTUDIANTE));
        when(usuarioRepository.findByCorreoIgnoreCase(usuario.getCorreo())).thenReturn(Optional.empty());
        when(passwordEncoder.encode("plana")).thenReturn("hash");
        when(usuarioRepository.save(usuario)).thenReturn(usuario);

        Usuario guardado = servicio.guardar(usuario);

        assertEquals("hash", guardado.getContrasena());
        assertTrue(guardado.getActivo());
        verify(usuarioRepository).save(usuario);
    }

    @Test
    void actualizaSinPerderLaContrasenaSiLlegaVacia() {
        Usuario existente = usuario(1, "anterior@myt.test", Set.of(RolUsuario.ESTUDIANTE));
        existente.setContrasena("hash-anterior");
        Usuario cambios = usuario(1, "nuevo@myt.test", Set.of(RolUsuario.ESTUDIANTE));
        cambios.setNombre("Actualizado");
        cambios.setContrasena("");
        when(usuarioRepository.findByCorreoIgnoreCase(cambios.getCorreo())).thenReturn(Optional.empty());
        when(usuarioRepository.findById(1)).thenReturn(Optional.of(existente));
        when(usuarioRepository.save(existente)).thenReturn(existente);

        Usuario actualizado = servicio.guardar(cambios);

        assertEquals("Actualizado", actualizado.getNombre());
        assertEquals("hash-anterior", actualizado.getContrasena());
    }

    @Test
    void protegeRolesDePerfilesExistentesYCorreosUnicos() {
        Usuario encontrado = usuario(2, "duplicado@myt.test", Set.of(RolUsuario.TUTOR));
        Usuario nuevo = usuario(null, "duplicado@myt.test", Set.of(RolUsuario.ESTUDIANTE));
        when(usuarioRepository.findByCorreoIgnoreCase(nuevo.getCorreo()))
                .thenReturn(Optional.of(encontrado));
        assertThrows(IllegalArgumentException.class, () -> servicio.guardar(nuevo));

        Usuario existente = usuario(1, "usuario@myt.test", Set.of(RolUsuario.ADMINISTRADOR));
        when(usuarioRepository.findByCorreoIgnoreCase(existente.getCorreo()))
                .thenReturn(Optional.of(existente));
        when(usuarioRepository.findById(1)).thenReturn(Optional.of(existente));
        when(estudianteRepository.existsByUsuarioId(1)).thenReturn(true);
        assertThrows(IllegalArgumentException.class, () -> servicio.guardar(existente));
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

        assertThrows(IllegalArgumentException.class, () -> servicio.desactivar(99));
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
