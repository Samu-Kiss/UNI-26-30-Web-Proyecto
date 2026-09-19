package com.typeerror.myt.controller;

import jakarta.validation.Valid;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;

import com.typeerror.myt.entities.Usuario;
import com.typeerror.myt.service.RegistroUsuarioService;
import com.typeerror.myt.service.ContextoSesion;
import com.typeerror.myt.service.UsuarioService;

@Controller
@RequestMapping("/usuarios")
public class UsuarioController {

    private static final String FORM_VIEW = "usuario-form";
    private static final String USUARIOS_PATH = "/usuarios";
    private final UsuarioService usuarioService;
    private final RegistroUsuarioService registroUsuarioService;

    public UsuarioController(UsuarioService usuarioService,
            RegistroUsuarioService registroUsuarioService) {
        this.usuarioService = usuarioService;
        this.registroUsuarioService = registroUsuarioService;
    }

    @GetMapping
    public String listar(Model model) {
        var usuarios = usuarioService.findAll();
        model.addAttribute("usuarios", usuarios);
        model.addAttribute("puedeAgregarPerfil", usuarios.stream().collect(
                java.util.stream.Collectors.toMap(Usuario::getId,
                        usuario -> registroUsuarioService.puedeAsignarPerfil(usuario.getId()))));
        return "usuarios";
    }

    @GetMapping("/{id}/editar")
    public String editar(@PathVariable Integer id, Model model) {
        var existente = usuarioService.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("El usuario no existe"));
        model.addAttribute("usuario", UsuarioForm.from(existente));
        return FORM_VIEW;
    }

    @PostMapping("/{id}/editar")
    public String guardar(@PathVariable Integer id,
            @Valid @ModelAttribute("usuario") UsuarioForm formulario,
            BindingResult bindingResult, @RequestParam String sesion) {
        formulario.setId(id);
        if (bindingResult.hasErrors()) {
            return FORM_VIEW;
        }
        try {
            usuarioService.guardar(formulario.toEntity());
        } catch (IllegalArgumentException exception) {
            bindingResult.reject("usuario.invalido", exception.getMessage());
            return FORM_VIEW;
        }
        return ContextoSesion.redireccion(USUARIOS_PATH, sesion);
    }

    @PostMapping("/{id}/desactivar")
    public String desactivar(@PathVariable Integer id, @RequestParam String sesion) {
        usuarioService.desactivar(id);
        return ContextoSesion.redireccion(USUARIOS_PATH, sesion);
    }

    @PostMapping("/{id}/activar")
    public String activar(@PathVariable Integer id, @RequestParam String sesion) {
        usuarioService.activar(id);
        return ContextoSesion.redireccion(USUARIOS_PATH, sesion);
    }
}
