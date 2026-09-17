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
import com.typeerror.myt.entities.Usuario;
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
        model.addAttribute("usuario", new Usuario());
        return FORM_VIEW;
    }

    @GetMapping("/editar/{id}")
    public String editar(@PathVariable Integer id, Model model) {
        Usuario existente = usuarioService.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("El usuario no existe"));
        Usuario formulario = new Usuario();
        formulario.setId(existente.getId());
        formulario.setNombre(existente.getNombre());
        formulario.setApellido(existente.getApellido());
        formulario.setCorreo(existente.getCorreo());
        formulario.setTelefono(existente.getTelefono());
        formulario.setActivo(existente.getActivo());
        formulario.setRoles(existente.getRoles());
        model.addAttribute("usuario", formulario);
        return FORM_VIEW;
    }

    @PostMapping("/guardar")
    public String guardar(@Valid @ModelAttribute("usuario") Usuario usuario,
            BindingResult bindingResult) {
        if (usuario.getId() == null && (usuario.getContrasena() == null
                || usuario.getContrasena().isBlank())) {
            bindingResult.rejectValue("contrasena", "contrasena.requerida",
                    "La contrasena es obligatoria para un usuario nuevo");
        }
        if (bindingResult.hasErrors()) {
            return FORM_VIEW;
        }
        try {
            usuarioService.guardar(usuario);
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
