package com.typeerror.myt.controller;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;

import jakarta.validation.Valid;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import com.typeerror.myt.entities.Usuario;
import com.typeerror.myt.service.ClienteService;

@Controller
@RequestMapping("/clientes")
public class ClienteController {

    private static final String CLIENTE_FORM_VIEW = "cliente-form";
    private static final String REDIRECT_CLIENTES = "redirect:/clientes";
    private static final String PERMITE_ASIGNAR_PERFIL = "permiteAsignarPerfil";
    private final ClienteService clienteService;

    public ClienteController(ClienteService clienteService) {
        this.clienteService = clienteService;
    }

    @GetMapping
    public String listarClientes(Model model) {
        return "redirect:/usuarios";
    }

    @GetMapping("/nuevo")
    public String nuevoCliente(Model model) {
        model.addAttribute("cliente", new ClienteForm());
        model.addAttribute("perfil", new RegistroPerfilForm());
        model.addAttribute(PERMITE_ASIGNAR_PERFIL, true);
        return CLIENTE_FORM_VIEW;
    }

    @GetMapping("/editar/{id}")
    public String editarCliente(@PathVariable Integer id, Model model) {
        Usuario existente = clienteService.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("El cliente no existe"));
        model.addAttribute("cliente", ClienteForm.from(existente));
        model.addAttribute("perfil", new RegistroPerfilForm());
        model.addAttribute(PERMITE_ASIGNAR_PERFIL, clienteService.puedeAsignarPerfil(id));
        return CLIENTE_FORM_VIEW;
    }

    @PostMapping("/guardar")
    public String guardarCliente(@Valid @ModelAttribute("cliente") ClienteForm formulario,
            BindingResult bindingResult,
            @ModelAttribute("perfil") RegistroPerfilForm perfil,
            Model model) {
        boolean permiteAsignarPerfil = formulario.getId() == null
                || clienteService.puedeAsignarPerfil(formulario.getId());
        model.addAttribute(PERMITE_ASIGNAR_PERFIL, permiteAsignarPerfil);
        if (bindingResult.hasErrors()) {
            return CLIENTE_FORM_VIEW;
        }
        if (formulario.getId() == null && (formulario.getContrasena() == null
                || formulario.getContrasena().isBlank())) {
            bindingResult.rejectValue("contrasena", "contrasena.requerida",
                    "La contrasena es obligatoria para un cliente nuevo");
            return CLIENTE_FORM_VIEW;
        }

        Usuario cliente = formulario.toEntity();
        try {
            if (permiteAsignarPerfil) {
                guardarClienteNuevo(cliente, perfil);
            } else {
                clienteService.guardar(cliente);
            }
        } catch (IllegalArgumentException exception) {
            if (exception.getMessage().contains("correo")) {
                bindingResult.rejectValue("correo", "correo.duplicado", exception.getMessage());
            } else {
                model.addAttribute("errorPerfil", exception.getMessage());
            }
            return CLIENTE_FORM_VIEW;
        }
        return REDIRECT_CLIENTES;
    }

    @PostMapping("/{id}/desactivar")
    public String desactivarCliente(@PathVariable Integer id) {
        clienteService.desactivar(id);
        return REDIRECT_CLIENTES;
    }

    @PostMapping("/{id}/activar")
    public String activarCliente(@PathVariable Integer id) {
        clienteService.activar(id);
        return REDIRECT_CLIENTES;
    }

    private void guardarClienteNuevo(Usuario cliente, RegistroPerfilForm perfil) {
        if (perfil.getRol() == null || perfil.getRol().isBlank()) {
            throw new IllegalArgumentException("Selecciona si la cuenta es de estudiante o tutor");
        }

        switch (perfil.getRol()) {
            case "ESTUDIANTE" -> clienteService.registrarEstudiante(cliente,
                    perfil.getCodigoEstudiantil(), perfil.getUniversidad(),
                    perfil.getProgramaAcademico(), convertirSemestre(perfil.getSemestre()));
            case "TUTOR" -> clienteService.registrarTutor(cliente, perfil.getBiografia(),
                    convertirMaterias(perfil.getMaterias()), convertirTarifa(perfil.getTarifaPorHora()));
            default -> throw new IllegalArgumentException("El tipo de cuenta seleccionado no es válido");
        }
    }

    private Integer convertirSemestre(String semestre) {
        if (semestre == null || semestre.isBlank()) {
            throw new IllegalArgumentException("El semestre es obligatorio");
        }
        try {
            return Integer.valueOf(semestre);
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException("Ingresa un semestre válido", exception);
        }
    }

    private BigDecimal convertirTarifa(String tarifa) {
        if (tarifa == null || tarifa.isBlank()) {
            throw new IllegalArgumentException("La tarifa por hora es obligatoria");
        }
        try {
            return new BigDecimal(tarifa);
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException("Ingresa una tarifa válida", exception);
        }
    }

    private List<String> convertirMaterias(String materias) {
        if (materias == null) {
            return List.of();
        }
        return Arrays.stream(materias.split(","))
                .map(String::trim)
                .filter(materia -> !materia.isEmpty())
                .distinct()
                .toList();
    }

}
