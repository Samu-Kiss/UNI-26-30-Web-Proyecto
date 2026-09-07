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

import com.typeerror.myt.entities.Cliente;
import com.typeerror.myt.service.ClienteService;

@Controller
@RequestMapping("/clientes")
public class ClienteController {

    private static final String CLIENTE_FORM_VIEW = "cliente-form";
    private static final String REDIRECT_CLIENTES = "redirect:/clientes";
    private final ClienteService clienteService;

    public ClienteController(ClienteService clienteService) {
        this.clienteService = clienteService;
    }

    @GetMapping
    public String listarClientes(Model model) {
        model.addAttribute("clientes", clienteService.findAll());
        return "clientes";
    }

    @GetMapping("/nuevo")
    public String nuevoCliente(Model model) {
        model.addAttribute("cliente", new Cliente());
        return CLIENTE_FORM_VIEW;
    }

    @GetMapping("/editar/{id}")
    public String editarCliente(@PathVariable Integer id, Model model) {
        Cliente existente = clienteService.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("El cliente no existe"));
        Cliente formulario = new Cliente(existente.getId(), existente.getNombre(), existente.getApellido(),
                existente.getCorreo(), null, existente.getTelefono(), existente.getActivo());
        model.addAttribute("cliente", formulario);
        return CLIENTE_FORM_VIEW;
    }

    @PostMapping("/guardar")
    public String guardarCliente(@Valid @ModelAttribute("cliente") Cliente cliente,
            BindingResult bindingResult) {
        if (bindingResult.hasErrors()) {
            return CLIENTE_FORM_VIEW;
        }
        if (cliente.getId() == null && (cliente.getContrasena() == null
                || cliente.getContrasena().isBlank())) {
            bindingResult.rejectValue("contrasena", "contrasena.requerida",
                    "La contrasena es obligatoria para un cliente nuevo");
            return CLIENTE_FORM_VIEW;
        }

        try {
            clienteService.guardar(cliente);
        } catch (IllegalArgumentException exception) {
            bindingResult.rejectValue("correo", "correo.duplicado", exception.getMessage());
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

}
