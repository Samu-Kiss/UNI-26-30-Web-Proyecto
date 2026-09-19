package com.typeerror.myt.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.times;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.ui.ExtendedModelMap;
import org.springframework.validation.BindingResult;

import com.typeerror.myt.entities.Usuario;
import com.typeerror.myt.service.RegistroUsuarioService;

class RegistroUsuarioControllerTest {

    private static final String SESION = "ADMINISTRADOR:1";

    private RegistroUsuarioService usuarioService;
    private RegistroUsuarioController controller;
    private BindingResult bindingResult;
    private ExtendedModelMap model;

    @BeforeEach
    void configurar() {
        usuarioService = mock(RegistroUsuarioService.class);
        controller = new RegistroUsuarioController(usuarioService);
        bindingResult = mock(BindingResult.class);
        model = new ExtendedModelMap();
    }

    @Test
    void conservaElFormularioCuandoLaValidacionDeBeanFalla() {
        when(bindingResult.hasErrors()).thenReturn(true);

        String vista = controller.guardarUsuario(usuarioNuevo(), bindingResult,
                perfilEstudiante("4"), model, SESION);

        assertEquals("registro-usuario-form", vista);
        assertTrue(model.containsAttribute("rolesPerfilDisponibles"));
        verifyNoInteractions(usuarioService);
    }

    @Test
    void exigeContrasenaAlCrearUnaCuenta() {
        RegistroUsuarioForm usuario = usuarioNuevo();
        usuario.setContrasena(null);

        String vistaConContrasenaNula = controller.guardarUsuario(usuario, bindingResult,
                perfilEstudiante("4"), model, SESION);

        usuario.setContrasena(" ");
        String vistaConContrasenaVacia = controller.guardarUsuario(usuario, bindingResult,
                perfilEstudiante("4"), model, SESION);

        assertEquals("registro-usuario-form", vistaConContrasenaNula);
        assertEquals("registro-usuario-form", vistaConContrasenaVacia);
        verify(bindingResult, times(2)).rejectValue("contrasena", "contrasena.requerida",
                "La contrasena es obligatoria para un usuario nuevo");
        verifyNoInteractions(usuarioService);
    }

    @Test
    void presentaElCorreoDuplicadoEnSuCampo() {
        RegistroUsuarioForm usuario = usuarioNuevo();
        RegistroPerfilForm perfil = perfilEstudiante("4");
        doThrow(new IllegalArgumentException("Ya existe un usuario con ese correo"))
                .when(usuarioService).registrarEstudiante(argThat(entidad -> coincide(entidad, usuario)), eq("EST-1"),
                        eq("Universidad"), eq("Sistemas"), eq(4));

        String vista = controller.guardarUsuario(usuario, bindingResult, perfil, model, SESION);

        assertEquals("registro-usuario-form", vista);
        verify(bindingResult).rejectValue("correo", "correo.duplicado",
                "Ya existe un usuario con ese correo");
    }

    @Test
    void presentaLosErroresDelPerfilSinAsignarlosAlCorreo() {
        RegistroPerfilForm perfilSinRol = new RegistroPerfilForm();

        String vista = controller.guardarUsuario(usuarioNuevo(), bindingResult,
                perfilSinRol, model, SESION);

        assertEquals("registro-usuario-form", vista);
        assertEquals("Selecciona si la cuenta es de estudiante o tutor",
                model.get("errorPerfil"));

        RegistroPerfilForm perfilConRolVacio = new RegistroPerfilForm();
        perfilConRolVacio.setRol(" ");
        controller.guardarUsuario(usuarioNuevo(), bindingResult, perfilConRolVacio, model, SESION);
        assertEquals("Selecciona si la cuenta es de estudiante o tutor",
                model.get("errorPerfil"));

        RegistroPerfilForm perfilDesconocido = new RegistroPerfilForm();
        perfilDesconocido.setRol("ADMIN");
        controller.guardarUsuario(usuarioNuevo(), bindingResult, perfilDesconocido, model, SESION);

        assertEquals("El tipo de cuenta seleccionado no es válido", model.get("errorPerfil"));
    }

    @Test
    void validaTodosLosFormatosDeSemestre() {
        verificarErrorDeSemestre(null, "El semestre es obligatorio");
        verificarErrorDeSemestre(" ", "El semestre es obligatorio");
        verificarErrorDeSemestre("cuarto", "Ingresa un semestre válido");
    }

    @Test
    void validaTodosLosFormatosDeTarifa() {
        verificarErrorDeTarifa(null, "La tarifa por hora es obligatoria");
        verificarErrorDeTarifa(" ", "La tarifa por hora es obligatoria");
        verificarErrorDeTarifa("cincuenta", "Ingresa una tarifa válida");
    }

    @Test
    void normalizaLasMateriasAntesDeRegistrarElTutor() {
        RegistroUsuarioForm usuario = usuarioNuevo();
        RegistroPerfilForm perfil = perfilTutor(" Cálculo, , Álgebra, Cálculo ", "50000");

        String resultado = controller.guardarUsuario(usuario, bindingResult, perfil, model, SESION);

        assertEquals("redirect:/usuarios?sesion=" + SESION, resultado);
        verify(usuarioService).registrarTutor(argThat(entidad -> coincide(entidad, usuario)), eq("Tutor de prueba"),
                eq(List.of("Cálculo", "Álgebra")), eq(new BigDecimal("50000")));

        RegistroUsuarioForm otroUsuario = usuarioNuevo();
        RegistroPerfilForm perfilSinMaterias = perfilTutor(null, "45000");
        controller.guardarUsuario(otroUsuario, bindingResult, perfilSinMaterias, model, SESION);

        verify(usuarioService).registrarTutor(argThat(entidad -> coincide(entidad, otroUsuario)), eq("Tutor de prueba"),
                eq(List.of()), eq(new BigDecimal("45000")));
    }

    @Test
    void preparaSoloLosPerfilesQueLeFaltanAlUsuario() {
        Usuario existente = usuarioNuevo().toEntity();
        existente.setId(15);
        when(usuarioService.findById(15)).thenReturn(Optional.of(existente));
        when(usuarioService.perfilesDisponibles(15))
                .thenReturn(Set.of(com.typeerror.myt.entities.RolUsuario.TUTOR));

        assertEquals("perfil-usuario-form", controller.nuevoPerfil(15, model));
        assertEquals(Set.of(com.typeerror.myt.entities.RolUsuario.TUTOR),
                model.get("rolesPerfilDisponibles"));
    }

    private void verificarErrorDeSemestre(String semestre, String mensajeEsperado) {
        controller.guardarUsuario(usuarioNuevo(), bindingResult,
                perfilEstudiante(semestre), model, SESION);
        assertEquals(mensajeEsperado, model.get("errorPerfil"));
    }

    private void verificarErrorDeTarifa(String tarifa, String mensajeEsperado) {
        controller.guardarUsuario(usuarioNuevo(), bindingResult,
                perfilTutor("Cálculo", tarifa), model, SESION);
        assertEquals(mensajeEsperado, model.get("errorPerfil"));
    }

    private RegistroUsuarioForm usuarioNuevo() {
        return new RegistroUsuarioForm("Nombre", "Apellido", "usuario@myt.test",
                "clave-plana", null);
    }

    private boolean coincide(Usuario usuario, RegistroUsuarioForm formulario) {
        return usuario.getId() == null
                && usuario.getNombre().equals(formulario.getNombre())
                && usuario.getApellido().equals(formulario.getApellido())
                && usuario.getCorreo().equals(formulario.getCorreo())
                && usuario.getContrasena().equals(formulario.getContrasena())
                && usuario.getTelefono() == formulario.getTelefono()
                && usuario.getActivo();
    }

    private RegistroPerfilForm perfilEstudiante(String semestre) {
        RegistroPerfilForm perfil = new RegistroPerfilForm();
        perfil.setRol("ESTUDIANTE");
        perfil.setCodigoEstudiantil("EST-1");
        perfil.setUniversidad("Universidad");
        perfil.setProgramaAcademico("Sistemas");
        perfil.setSemestre(semestre);
        return perfil;
    }

    private RegistroPerfilForm perfilTutor(String materias, String tarifa) {
        RegistroPerfilForm perfil = new RegistroPerfilForm();
        perfil.setRol("TUTOR");
        perfil.setBiografia("Tutor de prueba");
        perfil.setMaterias(materias);
        perfil.setTarifaPorHora(tarifa);
        return perfil;
    }
}
