package com.typeerror.myt.entities;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/** Mensaje enviado por uno de los dos participantes de una conversacion. */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "mensajes")
public class Mensaje {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conversacion_id", nullable = false)
    @ToString.Exclude
    private Conversacion conversacion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "remitente_usuario_id", nullable = false)
    private Usuario remitente;

    @NotBlank
    @Size(max = 4000)
    @Column(nullable = false, length = 4000)
    private String contenido;

    @Column(name = "fecha_envio", nullable = false, updatable = false)
    private LocalDateTime fechaEnvio;

    @Column(name = "fecha_edicion")
    private LocalDateTime fechaEdicion;

    @Column(name = "fecha_eliminacion")
    private LocalDateTime fechaEliminacion;

    @Column(name = "leido_en")
    private LocalDateTime leidoEn;

    @Version
    @Column(nullable = false)
    private Long version;

    public Mensaje(Conversacion conversacion, Usuario remitente, String contenido) {
        this.conversacion = conversacion;
        this.remitente = remitente;
        this.contenido = contenido;
    }

    @PrePersist
    void prepararEnvio() {
        fechaEnvio = LocalDateTime.now(ZoneOffset.UTC);
    }

    public boolean estaEliminado() {
        return fechaEliminacion != null;
    }
}
