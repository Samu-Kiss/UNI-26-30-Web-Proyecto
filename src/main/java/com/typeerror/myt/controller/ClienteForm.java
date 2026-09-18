package com.typeerror.myt.controller;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import com.typeerror.myt.entities.Usuario;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class ClienteForm {

    private Integer id;

    @NotBlank(message = "El nombre es obligatorio")
    @Size(max = 100, message = "El nombre no puede superar 100 caracteres")
    private String nombre;

    @NotBlank(message = "El apellido es obligatorio")
    @Size(max = 100, message = "El apellido no puede superar 100 caracteres")
    private String apellido;

    @NotBlank(message = "El correo es obligatorio")
    @Email(message = "Ingresa un correo valido")
    @Size(max = 120, message = "El correo no puede superar 120 caracteres")
    private String correo;

    @Size(max = 72, message = "La contrasena no puede superar 72 caracteres")
    private String contrasena;

    @Size(max = 30, message = "El telefono no puede superar 30 caracteres")
    private String telefono;

    private Boolean activo = true;

    public static ClienteForm from(Usuario cliente) {
        return new ClienteForm(cliente.getId(), cliente.getNombre(), cliente.getApellido(),
                cliente.getCorreo(), null, cliente.getTelefono(), cliente.getActivo());
    }

    public Usuario toEntity() {
        Usuario usuario = new Usuario();
        usuario.setId(id);
        usuario.setNombre(nombre);
        usuario.setApellido(apellido);
        usuario.setCorreo(correo);
        usuario.setContrasena(contrasena);
        usuario.setTelefono(telefono);
        usuario.setActivo(activo);
        return usuario;
    }
}
