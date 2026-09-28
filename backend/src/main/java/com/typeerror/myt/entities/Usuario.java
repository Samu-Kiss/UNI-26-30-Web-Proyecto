package com.typeerror.myt.entities;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HashSet;
import java.util.Set;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/** Identidad autenticable comun a estudiantes, tutores y administradores. */
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Entity
@Table(name = "usuarios")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @NotBlank(message = "El nombre es obligatorio")
    @Size(max = 100)
    @Column(nullable = false, length = 100)
    private String nombre;

    @NotBlank(message = "El apellido es obligatorio")
    @Size(max = 100)
    @Column(nullable = false, length = 100)
    private String apellido;

    @NotBlank(message = "El correo es obligatorio")
    @Email(message = "Ingresa un correo valido")
    @Size(max = 120)
    @Column(nullable = false, unique = true, length = 120)
    private String correo;

    @Size(max = 72)
    @Column(nullable = false, length = 72)
    @ToString.Exclude
    private String contrasena;

    @Size(max = 30)
    @Column(length = 30)
    private String telefono;

    @Column(nullable = false)
    private Boolean activo = true;

    @NotEmpty(message = "El usuario debe tener al menos un rol")
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "usuario_roles", joinColumns = @JoinColumn(name = "usuario_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "rol", nullable = false, length = 30)
    private Set<RolUsuario> roles = new HashSet<>();

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_actualizacion", nullable = false)
    private LocalDateTime fechaActualizacion;

    @Version
    @Column(nullable = false)
    private Long version;

    @PrePersist
    void prepararCreacion() {
        LocalDateTime ahora = LocalDateTime.now(ZoneOffset.UTC);
        if (activo == null) {
            activo = true;
        }
        fechaCreacion = ahora;
        fechaActualizacion = ahora;
    }

    @PreUpdate
    void prepararActualizacion() {
        fechaActualizacion = LocalDateTime.now(ZoneOffset.UTC);
    }
}
