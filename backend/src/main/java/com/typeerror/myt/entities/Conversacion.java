package com.typeerror.myt.entities;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/** Canal privado y unico entre el estudiante y el tutor de una reserva. */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "conversaciones")
public class Conversacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reserva_id", nullable = false, unique = true)
    @ToString.Exclude
    private Reserva reserva;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoConversacion estado = EstadoConversacion.ACTIVA;

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @Version
    @Column(nullable = false)
    private Long version;

    @OneToMany(mappedBy = "conversacion", fetch = FetchType.LAZY)
    @ToString.Exclude
    private List<Mensaje> mensajes = new ArrayList<>();

    public Conversacion(Reserva reserva) {
        this.reserva = reserva;
    }

    @PrePersist
    void prepararCreacion() {
        if (estado == null) {
            estado = EstadoConversacion.ACTIVA;
        }
        fechaCreacion = LocalDateTime.now(ZoneOffset.UTC);
    }
}
