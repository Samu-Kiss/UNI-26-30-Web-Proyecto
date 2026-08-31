package com.typeerror.myt.entities;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "estudiantes")
public class Estudiante {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cliente_id", nullable = false, unique = true)
    @ToString.Exclude
    private Cliente cliente;

    @Column(name = "codigo_estudiantil", nullable = false, unique = true, length = 30)
    private String codigoEstudiantil;

    @Column(nullable = false, length = 150)
    private String universidad;

    @Column(name = "programa_academico", nullable = false, length = 150)
    private String programaAcademico;

    @Column(nullable = false)
    private Integer semestre;

    @OneToMany(mappedBy = "estudiante", fetch = FetchType.LAZY)
    @ToString.Exclude
    private List<Reserva> reservas = new ArrayList<>();

    public Estudiante(Integer id, Cliente cliente, String codigoEstudiantil, String universidad,
            String programaAcademico, Integer semestre) {
        this.id = id;
        this.cliente = cliente;
        this.codigoEstudiantil = codigoEstudiantil;
        this.universidad = universidad;
        this.programaAcademico = programaAcademico;
        this.semestre = semestre;
    }

}
