package com.typeerror.myt.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Entity
@Table(name = "clientes")
public class Cliente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @NotBlank(message = "El nombre es obligatorio")
    @Size(max = 100, message = "El nombre no puede superar 100 caracteres")
    @Column(nullable = false, length = 100)
    private String nombre;

    @NotBlank(message = "El apellido es obligatorio")
    @Size(max = 100, message = "El apellido no puede superar 100 caracteres")
    @Column(nullable = false, length = 100)
    private String apellido;

    @NotBlank(message = "El correo es obligatorio")
    @Email(message = "Ingresa un correo valido")
    @Size(max = 120, message = "El correo no puede superar 120 caracteres")
    @Column(nullable = false, unique = true, length = 120)
    private String correo;

    @Size(max = 72, message = "La contrasena no puede superar 72 caracteres")
    @Column(nullable = false, length = 72)
    @ToString.Exclude
    private String contrasena;

    @Size(max = 30, message = "El telefono no puede superar 30 caracteres")
    @Column(length = 30)
    private String telefono;

    @Column(nullable = false)
    private Boolean activo = true;

    @PrePersist
    void asegurarEstadoInicial() {
        if (activo == null) {
            activo = true;
        }
    }

}
