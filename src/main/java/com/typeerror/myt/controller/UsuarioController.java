package com.typeerror.myt.controller;

import jakarta.validation.Valid;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import com.typeerror.myt.entities.RolUsuario;
import com.typeerror.myt.service.UsuarioService;

@Controller
@RequestMapping("/usuarios")
public class UsuarioController {

    private static final String FORM_VIEW = "usuario-form";
    private static final String REDIRECT_USUARIOS = "redirect:/usuarios";
    private final UsuarioService usuarioService;

    public UsuarioController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @ModelAttribute("rolesDisponibles")
    public RolUsuario[] rolesDisponibles() {
        return RolUsuario.values();
    }

    @GetMapping
    public String listar(Model model) {
        model.addAttribute("usuarios", usuarioService.findAll());
        return "usuarios";
    }

    @GetMapping("/nuevo")
    public String nuevo(Model model) {
        model.addAttribute("usuario", new UsuarioForm());
        return FORM_VIEW;
    }

    @GetMapping("/editar/{id}")
    public String editar(@PathVariable Integer id, Model model) {
        var existente = usuarioService.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("El usuario no existe"));
        model.addAttribute("usuario", UsuarioForm.from(existente));
        return FORM_VIEW;
    }

    @PostMapping("/guardar")
    public String guardar(@Valid @ModelAttribute("usuario") UsuarioForm formulario,
            BindingResult bindingResult) {
        if (formulario.getId() == null && (formulario.getContrasena() == null
                || formulario.getContrasena().isBlank())) {
            bindingResult.rejectValue("contrasena", "contrasena.requerida",
                    "La contrasena es obligatoria para un usuario nuevo");
        }
        if (bindingResult.hasErrors()) {
            return FORM_VIEW;
        }
        try {
            usuarioService.guardar(formulario.toEntity());
        } catch (IllegalArgumentException exception) {
            bindingResult.reject("usuario.invalido", exception.getMessage());
            return FORM_VIEW;
        }
        return REDIRECT_USUARIOS;
    }

    @PostMapping("/{id}/desactivar")
    public String desactivar(@PathVariable Integer id) {
        usuarioService.desactivar(id);
        return REDIRECT_USUARIOS;
    }

    @PostMapping("/{id}/activar")
    public String activar(@PathVariable Integer id) {
        usuarioService.activar(id);
        return REDIRECT_USUARIOS;
    }
}
