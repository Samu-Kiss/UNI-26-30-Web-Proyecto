package com.typeerror.myt.entities;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/** Perfil profesional de un usuario que ofrece tutorias. */
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
    @JoinColumn(name = "usuario_id", nullable = false, unique = true)
    @ToString.Exclude
    private Usuario usuario;

    @Size(max = 2000)
    @Column(length = 2000)
    private String biografia;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "tutor_materias",
        joinColumns = @JoinColumn(name = "tutor_id"),
        inverseJoinColumns = @JoinColumn(name = "materia_id")
    )
    private Set<Materia> materias = new HashSet<>();

    @NotNull
    @Positive
    @Column(name = "tarifa_por_hora", nullable = false, precision = 12, scale = 2)
    private BigDecimal tarifaPorHora;

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

    public Tutor(Integer id, Usuario usuario, String biografia, Set<Materia> materias,
            BigDecimal tarifaPorHora, Boolean disponible) {
        this.id = id;
        this.usuario = usuario;
        this.biografia = biografia;
        this.materias = new HashSet<>(materias);
        this.tarifaPorHora = tarifaPorHora;
        this.disponible = disponible;
    }

    @PrePersist
    @PreUpdate
    void asegurarDisponibilidadInicial() {
        if (usuario == null || !usuario.getRoles().contains(RolUsuario.TUTOR)) {
            throw new IllegalStateException("El perfil de tutor requiere el rol TUTOR");
        }
        if (disponible == null) {
            disponible = true;
        }
    }
}
