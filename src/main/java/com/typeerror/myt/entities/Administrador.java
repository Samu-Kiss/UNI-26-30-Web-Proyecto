package com.typeerror.myt.entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class Administrador {

    private Integer id;
    private String nombre;
    private String apellido;
    private String correo;
    private String contrasena;
    private String telefono;
    private Boolean activo;

}
