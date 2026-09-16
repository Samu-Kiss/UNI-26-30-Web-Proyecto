package com.typeerror.myt.entities;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "tutores")
public class Tutor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cliente_id", nullable = false, unique = true)
    @ToString.Exclude
    private Cliente cliente;

    @Size(max = 2000)
    @Column(length = 2000)
    private String biografia;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "tutor_materias", joinColumns = @JoinColumn(name = "tutor_id"))
    @OrderColumn(name = "orden")
    @Column(name = "materia", nullable = false, length = 100)
    private List<String> materias = new ArrayList<>();

    @NotNull
    @Positive
    @Column(name = "tarifa_por_hora", nullable = false, precision = 12, scale = 2)
    private BigDecimal tarifaPorHora;

    @DecimalMin("0.0")
    @DecimalMax("5.0")
    @Column(name = "calificacion_promedio")
    private Double calificacionPromedio;

    @Column(nullable = false)
    private Boolean disponible = true;

    @OneToMany(mappedBy = "tutor", fetch = FetchType.LAZY)
    @ToString.Exclude
    private Set<Reserva> reservas = new HashSet<>();

    @OneToMany(
        mappedBy = "tutor",
        cascade = CascadeType.ALL,
        orphanRemoval = true,
        fetch = FetchType.LAZY
    )
    @ToString.Exclude
    private List<DisponibilidadTutor> disponibilidades = new ArrayList<>();

    public Tutor(Integer id, Cliente cliente, String biografia, List<String> materias,
            BigDecimal tarifaPorHora, Double calificacionPromedio, Boolean disponible) {
        this.id = id;
        this.cliente = cliente;
        this.biografia = biografia;
        this.materias = new ArrayList<>(materias);
        this.tarifaPorHora = tarifaPorHora;
        this.calificacionPromedio = calificacionPromedio;
        this.disponible = disponible;
    }

    @PrePersist
    void asegurarDisponibilidadInicial() {
        if (disponible == null) {
            disponible = true;
        }
    }
}
