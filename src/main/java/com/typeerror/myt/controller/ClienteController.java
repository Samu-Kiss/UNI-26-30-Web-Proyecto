package com.typeerror.myt.controller;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
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

    private final ClienteService clienteService;

    @Autowired
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
        return "cliente-form";
    }

    @GetMapping("/editar/{id}")
    public String editarCliente(@PathVariable Integer id, Model model) {
        Cliente existente = clienteService.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("El cliente no existe"));
        Cliente formulario = new Cliente(existente.getId(), existente.getNombre(), existente.getApellido(),
                existente.getCorreo(), null, existente.getTelefono(), existente.getActivo());
        model.addAttribute("cliente", formulario);
        return "cliente-form";
    }

    @PostMapping("/guardar")
    public String guardarCliente(@Valid @ModelAttribute("cliente") Cliente cliente,
            BindingResult bindingResult) {
        if (bindingResult.hasErrors()) {
            return "cliente-form";
        }
        if (cliente.getId() == null && (cliente.getContrasena() == null
                || cliente.getContrasena().isBlank())) {
            bindingResult.rejectValue("contrasena", "contrasena.requerida",
                    "La contrasena es obligatoria para un cliente nuevo");
            return "cliente-form";
        }

        try {
            clienteService.guardar(cliente);
        } catch (IllegalArgumentException exception) {
            bindingResult.rejectValue("correo", "correo.duplicado", exception.getMessage());
            return "cliente-form";
        }
        return "redirect:/clientes";
    }

    @PostMapping("/{id}/desactivar")
    public String desactivarCliente(@PathVariable Integer id) {
        clienteService.desactivar(id);
        return "redirect:/clientes";
    }

    @PostMapping("/{id}/activar")
    public String activarCliente(@PathVariable Integer id) {
        clienteService.activar(id);
        return "redirect:/clientes";
    }

}
