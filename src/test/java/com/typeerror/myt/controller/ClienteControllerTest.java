package com.typeerror.myt.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.same;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.times;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.ui.ExtendedModelMap;
import org.springframework.validation.BindingResult;

import com.typeerror.myt.entities.Cliente;
import com.typeerror.myt.service.ClienteService;

class ClienteControllerTest {

    private ClienteService clienteService;
    private ClienteController controller;
    private BindingResult bindingResult;
    private ExtendedModelMap model;

    @BeforeEach
    void configurar() {
        clienteService = mock(ClienteService.class);
        controller = new ClienteController(clienteService);
        bindingResult = mock(BindingResult.class);
        model = new ExtendedModelMap();
    }

    @Test
    void conservaElFormularioCuandoLaValidacionDeBeanFalla() {
        when(bindingResult.hasErrors()).thenReturn(true);

        String vista = controller.guardarCliente(clienteNuevo(), bindingResult,
                perfilEstudiante("4"), model);

        assertEquals("cliente-form", vista);
        assertTrue((Boolean) model.get("permiteAsignarPerfil"));
        verifyNoInteractions(clienteService);
    }

    @Test
    void exigeContrasenaAlCrearUnaCuenta() {
        Cliente cliente = clienteNuevo();
        cliente.setContrasena(null);

        String vistaConContrasenaNula = controller.guardarCliente(cliente, bindingResult,
                perfilEstudiante("4"), model);

        cliente.setContrasena(" ");
        String vistaConContrasenaVacia = controller.guardarCliente(cliente, bindingResult,
                perfilEstudiante("4"), model);

        assertEquals("cliente-form", vistaConContrasenaNula);
        assertEquals("cliente-form", vistaConContrasenaVacia);
        verify(bindingResult, times(2)).rejectValue("contrasena", "contrasena.requerida",
                "La contrasena es obligatoria para un cliente nuevo");
        verifyNoInteractions(clienteService);
    }

    @Test
    void presentaElCorreoDuplicadoEnSuCampo() {
        Cliente cliente = clienteNuevo();
        RegistroPerfilForm perfil = perfilEstudiante("4");
        doThrow(new IllegalArgumentException("Ya existe un cliente con ese correo"))
                .when(clienteService).registrarEstudiante(same(cliente), eq("EST-1"),
                        eq("Universidad"), eq("Sistemas"), eq(4));

        String vista = controller.guardarCliente(cliente, bindingResult, perfil, model);

        assertEquals("cliente-form", vista);
        verify(bindingResult).rejectValue("correo", "correo.duplicado",
                "Ya existe un cliente con ese correo");
    }

    @Test
    void presentaLosErroresDelPerfilSinAsignarlosAlCorreo() {
        RegistroPerfilForm perfilSinRol = new RegistroPerfilForm();

        String vista = controller.guardarCliente(clienteNuevo(), bindingResult,
                perfilSinRol, model);

        assertEquals("cliente-form", vista);
        assertEquals("Selecciona si la cuenta es de estudiante o tutor",
                model.get("errorPerfil"));

        RegistroPerfilForm perfilConRolVacio = new RegistroPerfilForm();
        perfilConRolVacio.setRol(" ");
        controller.guardarCliente(clienteNuevo(), bindingResult, perfilConRolVacio, model);
        assertEquals("Selecciona si la cuenta es de estudiante o tutor",
                model.get("errorPerfil"));

        RegistroPerfilForm perfilDesconocido = new RegistroPerfilForm();
        perfilDesconocido.setRol("ADMIN");
        controller.guardarCliente(clienteNuevo(), bindingResult, perfilDesconocido, model);

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
        Cliente cliente = clienteNuevo();
        RegistroPerfilForm perfil = perfilTutor(" Cálculo, , Álgebra, Cálculo ", "50000");

        String resultado = controller.guardarCliente(cliente, bindingResult, perfil, model);

        assertEquals("redirect:/clientes", resultado);
        verify(clienteService).registrarTutor(same(cliente), eq("Tutor de prueba"),
                eq(List.of("Cálculo", "Álgebra")), eq(new BigDecimal("50000")));

        Cliente otroCliente = clienteNuevo();
        RegistroPerfilForm perfilSinMaterias = perfilTutor(null, "45000");
        controller.guardarCliente(otroCliente, bindingResult, perfilSinMaterias, model);

        verify(clienteService).registrarTutor(same(otroCliente), eq("Tutor de prueba"),
                eq(List.of()), eq(new BigDecimal("45000")));
    }

    private void verificarErrorDeSemestre(String semestre, String mensajeEsperado) {
        controller.guardarCliente(clienteNuevo(), bindingResult,
                perfilEstudiante(semestre), model);
        assertEquals(mensajeEsperado, model.get("errorPerfil"));
    }

    private void verificarErrorDeTarifa(String tarifa, String mensajeEsperado) {
        controller.guardarCliente(clienteNuevo(), bindingResult,
                perfilTutor("Cálculo", tarifa), model);
        assertEquals(mensajeEsperado, model.get("errorPerfil"));
    }

    private Cliente clienteNuevo() {
        return new Cliente(null, "Nombre", "Apellido", "cliente@myt.test",
                "clave-plana", null, true);
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
