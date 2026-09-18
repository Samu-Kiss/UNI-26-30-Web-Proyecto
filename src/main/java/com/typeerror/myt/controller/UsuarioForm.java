package com.typeerror.myt.controller;

import java.util.HashSet;
import java.util.Set;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import com.typeerror.myt.entities.RolUsuario;
import com.typeerror.myt.entities.Usuario;

/** Datos editables de un usuario, separados de la entidad persistente. */
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class UsuarioForm {

    private Integer id;

    @NotBlank(message = "El nombre es obligatorio")
    @Size(max = 100)
    private String nombre;

    @NotBlank(message = "El apellido es obligatorio")
    @Size(max = 100)
    private String apellido;

    @NotBlank(message = "El correo es obligatorio")
    @Email(message = "Ingresa un correo valido")
    @Size(max = 120)
    private String correo;

    @Size(max = 72)
    private String contrasena;

    @Size(max = 30)
    private String telefono;

    @NotEmpty(message = "El usuario debe tener al menos un rol")
    private Set<RolUsuario> roles = new HashSet<>();

    public static UsuarioForm from(Usuario usuario) {
        return new UsuarioForm(usuario.getId(), usuario.getNombre(), usuario.getApellido(),
                usuario.getCorreo(), null, usuario.getTelefono(), new HashSet<>(usuario.getRoles()));
    }

    public Usuario toEntity() {
        Usuario usuario = new Usuario();
        usuario.setId(id);
        usuario.setNombre(nombre);
        usuario.setApellido(apellido);
        usuario.setCorreo(correo);
        usuario.setContrasena(contrasena);
        usuario.setTelefono(telefono);
        usuario.setRoles(new HashSet<>(roles));
        return usuario;
    }
}
