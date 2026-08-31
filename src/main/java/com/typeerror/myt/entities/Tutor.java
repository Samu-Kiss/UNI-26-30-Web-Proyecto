package com.typeerror.myt.entities;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
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

    @Column(length = 2000)
    private String biografia;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "tutor_materias", joinColumns = @JoinColumn(name = "tutor_id"))
    @OrderColumn(name = "orden")
    @Column(name = "materia", nullable = false, length = 100)
    private List<String> materias = new ArrayList<>();

    @Column(name = "tarifa_por_hora", nullable = false, precision = 12, scale = 2)
    private BigDecimal tarifaPorHora;

    @Column(name = "calificacion_promedio")
    private Double calificacionPromedio;

    @Column(nullable = false)
    private Boolean disponible = true;

    @OneToMany(mappedBy = "tutor", fetch = FetchType.LAZY)
    @ToString.Exclude
    private List<Reserva> reservas = new ArrayList<>();

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
