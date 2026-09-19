package com.typeerror.myt.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
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
import org.springframework.ui.ConcurrentModel;
import org.springframework.validation.BeanPropertyBindingResult;

import com.typeerror.myt.entities.RolUsuario;
import com.typeerror.myt.entities.Usuario;
import com.typeerror.myt.service.RegistroUsuarioService;
import com.typeerror.myt.service.UsuarioService;

@ExtendWith(MockitoExtension.class)
class UsuarioControllerTest {

    private static final String SESION = "ADMINISTRADOR:1";

    @Mock
    private UsuarioService usuarioService;
    @Mock
    private RegistroUsuarioService registroUsuarioService;

    private UsuarioController controller;

    @BeforeEach
    void preparar() {
        controller = new UsuarioController(usuarioService, registroUsuarioService);
    }

    @Test
    void publicaListadoConDisponibilidadDePerfiles() {
        ConcurrentModel model = new ConcurrentModel();
        when(usuarioService.findAll()).thenReturn(List.of());

        assertEquals("usuarios", controller.listar(model));
        assertTrue(model.containsAttribute("usuarios"));
        assertTrue(model.containsAttribute("puedeAgregarPerfil"));
    }

    @Test
    void preparaEdicionSinExponerContrasena() {
        Usuario usuario = usuario(1);
        usuario.setContrasena("hash-secreto");
        when(usuarioService.findById(1)).thenReturn(Optional.of(usuario));
        ConcurrentModel model = new ConcurrentModel();

        assertEquals("usuario-form", controller.editar(1, model));
        UsuarioForm formulario = (UsuarioForm) model.getAttribute("usuario");
        assertEquals(usuario.getCorreo(), formulario.getCorreo());
        assertNull(formulario.getContrasena());
    }

    @Test
    void conservaLosErroresDeEdicion() {
        UsuarioForm formulario = formulario(1);
        formulario.setNombre("");
        BeanPropertyBindingResult errores = errores(formulario);
        errores.rejectValue("nombre", "nombre.requerido");

        assertEquals("usuario-form", controller.guardar(1, formulario, errores, SESION));
        assertTrue(errores.hasFieldErrors("nombre"));
    }

    @Test
    void guardaYReportaErroresDelServicio() {
        UsuarioForm formulario = formulario(1);
        BeanPropertyBindingResult sinErrores = errores(formulario);

        assertEquals("redirect:/usuarios?sesion=" + SESION,
                controller.guardar(1, formulario, sinErrores, SESION));
        verify(usuarioService).guardar(any(Usuario.class));

        doThrow(new IllegalArgumentException("Correo duplicado"))
                .when(usuarioService).guardar(any(Usuario.class));
        BeanPropertyBindingResult erroresServicio = errores(formulario);
        assertEquals("usuario-form", controller.guardar(1, formulario, erroresServicio, SESION));
        assertTrue(erroresServicio.hasGlobalErrors());
    }

    @Test
    void activaDesactivaYReportaEdicionInexistente() {
        assertEquals("redirect:/usuarios?sesion=" + SESION, controller.desactivar(1, SESION));
        assertEquals("redirect:/usuarios?sesion=" + SESION, controller.activar(1, SESION));
        verify(usuarioService).desactivar(1);
        verify(usuarioService).activar(1);

        when(usuarioService.findById(99)).thenReturn(Optional.empty());
        ConcurrentModel model = new ConcurrentModel();
        assertThrows(IllegalArgumentException.class, () -> controller.editar(99, model));
    }

    @Test
    void convierteFormularioSinCompartirLaColeccionDeRoles() {
        Usuario usuario = usuario(1);
        UsuarioForm formulario = UsuarioForm.from(usuario);
        Usuario convertido = formulario.toEntity();

        assertEquals(usuario.getId(), convertido.getId());
        assertEquals(usuario.getRoles(), convertido.getRoles());
        assertNotSame(usuario.getRoles(), convertido.getRoles());
    }

    private BeanPropertyBindingResult errores(UsuarioForm formulario) {
        return new BeanPropertyBindingResult(formulario, "usuario");
    }

    private UsuarioForm formulario(Integer id) {
        return new UsuarioForm(id, "Nombre", "Apellido", "usuario@myt.test",
                "secreto", "3000000000", Set.of(RolUsuario.ESTUDIANTE));
    }

    private Usuario usuario(Integer id) {
        Usuario usuario = new Usuario();
        usuario.setId(id);
        usuario.setNombre("Nombre");
        usuario.setApellido("Apellido");
        usuario.setCorreo("usuario@myt.test");
        usuario.setTelefono("3000000000");
        usuario.setActivo(true);
        usuario.setRoles(Set.of(RolUsuario.ESTUDIANTE));
        return usuario;
    }
}
