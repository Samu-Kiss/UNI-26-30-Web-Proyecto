package com.typeerror.myt.controller;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Set;

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
import com.typeerror.myt.entities.RolUsuario;
import com.typeerror.myt.service.RegistroUsuarioService;

@Controller
@RequestMapping("/usuarios")
public class RegistroUsuarioController {

    private static final String REGISTRO_FORM_VIEW = "registro-usuario-form";
    private static final String REDIRECT_USUARIOS = "redirect:/usuarios";
    private static final String MODEL_USUARIO = "usuario";
    private static final String MODEL_ROLES_PERFIL = "rolesPerfilDisponibles";
    private final RegistroUsuarioService usuarioService;

    public RegistroUsuarioController(RegistroUsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @GetMapping("/nuevo")
    public String nuevoUsuario(Model model) {
        model.addAttribute(MODEL_USUARIO, new RegistroUsuarioForm());
        model.addAttribute("perfil", new RegistroPerfilForm());
        model.addAttribute(MODEL_ROLES_PERFIL,
                Set.of(RolUsuario.ESTUDIANTE, RolUsuario.TUTOR));
        return REGISTRO_FORM_VIEW;
    }

    @GetMapping("/{id}/perfil/nuevo")
    public String nuevoPerfil(@PathVariable Integer id, Model model) {
        Usuario existente = usuarioService.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("El usuario no existe"));
        Set<RolUsuario> disponibles = usuarioService.perfilesDisponibles(id);
        if (disponibles.isEmpty()) {
            throw new IllegalArgumentException("El usuario ya tiene todos los perfiles disponibles");
        }
        model.addAttribute(MODEL_USUARIO, existente);
        model.addAttribute("perfil", new RegistroPerfilForm());
        model.addAttribute(MODEL_ROLES_PERFIL, disponibles);
        return "perfil-usuario-form";
    }

    @PostMapping("/registrar")
    public String guardarUsuario(@Valid @ModelAttribute(MODEL_USUARIO) RegistroUsuarioForm formulario,
            BindingResult bindingResult,
            @ModelAttribute("perfil") RegistroPerfilForm perfil,
            Model model) {
        model.addAttribute(MODEL_ROLES_PERFIL,
                Set.of(RolUsuario.ESTUDIANTE, RolUsuario.TUTOR));
        if (bindingResult.hasErrors()) {
            return REGISTRO_FORM_VIEW;
        }
        if (formulario.getContrasena() == null
                || formulario.getContrasena().isBlank()) {
            bindingResult.rejectValue("contrasena", "contrasena.requerida",
                    "La contrasena es obligatoria para un usuario nuevo");
            return REGISTRO_FORM_VIEW;
        }

        Usuario usuario = formulario.toEntity();
        try {
            guardarPerfil(usuario, perfil);
        } catch (IllegalArgumentException exception) {
            if (exception.getMessage().contains("correo")) {
                bindingResult.rejectValue("correo", "correo.duplicado", exception.getMessage());
            } else {
                model.addAttribute("errorPerfil", exception.getMessage());
            }
            return REGISTRO_FORM_VIEW;
        }
        return REDIRECT_USUARIOS;
    }

    @PostMapping("/{id}/perfil")
    public String guardarPerfil(@PathVariable Integer id,
            @ModelAttribute("perfil") RegistroPerfilForm perfil, Model model) {
        Usuario usuario = usuarioService.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("El usuario no existe"));
        try {
            guardarPerfil(usuario, perfil);
            return REDIRECT_USUARIOS;
        } catch (IllegalArgumentException exception) {
            model.addAttribute(MODEL_USUARIO, usuario);
            model.addAttribute(MODEL_ROLES_PERFIL, usuarioService.perfilesDisponibles(id));
            model.addAttribute("errorPerfil", exception.getMessage());
            return "perfil-usuario-form";
        }
    }

    private void guardarPerfil(Usuario usuario, RegistroPerfilForm perfil) {
        if (perfil.getRol() == null || perfil.getRol().isBlank()) {
            throw new IllegalArgumentException("Selecciona si la cuenta es de estudiante o tutor");
        }

        switch (perfil.getRol()) {
            case "ESTUDIANTE" -> usuarioService.registrarEstudiante(usuario,
                    perfil.getCodigoEstudiantil(), perfil.getUniversidad(),
                    perfil.getProgramaAcademico(), convertirSemestre(perfil.getSemestre()));
            case "TUTOR" -> usuarioService.registrarTutor(usuario, perfil.getBiografia(),
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
