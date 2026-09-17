package com.typeerror.myt.entities;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneOffset;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/** Acuerdo de tutoria entre un estudiante y un tutor para una materia y horario. */
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Entity
@Table(name = "reservas")
public class Reserva {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "estudiante_id", nullable = false)
    @ToString.Exclude
    private Estudiante estudiante;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tutor_id", nullable = false)
    @ToString.Exclude
    private Tutor tutor;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "materia_id", nullable = false)
    private Materia materia;

    @NotNull
    @Column(nullable = false)
    private LocalDate fecha;

    @NotNull
    @Column(name = "hora_inicio", nullable = false)
    private LocalTime horaInicio;

    @NotNull
    @Positive
    @Column(name = "duracion_minutos", nullable = false)
    private Integer duracionMinutos;

    @NotBlank
    @Size(max = 300)
    @Column(nullable = false, length = 300)
    private String tema;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ModalidadReserva modalidad;

    @Size(max = 500)
    @Column(name = "ubicacion_o_enlace", length = 500)
    private String ubicacionOEnlace;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private EstadoReserva estado;

    @NotNull
    @Positive
    @Column(name = "costo_total", nullable = false, precision = 12, scale = 2)
    private BigDecimal costoTotal;

    @NotBlank
    @Size(min = 3, max = 3)
    @Column(nullable = false, length = 3)
    private String moneda = "COP";

    @Size(max = 500)
    @Column(name = "motivo_cancelacion", length = 500)
    private String motivoCancelacion;

    @Column(name = "fecha_cancelacion")
    private LocalDateTime fechaCancelacion;

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_actualizacion", nullable = false)
    private LocalDateTime fechaActualizacion;

    @Version
    @Column(nullable = false)
    private Long version;

    @OneToOne(
        mappedBy = "reserva",
        fetch = FetchType.LAZY
    )
    @ToString.Exclude
    private Resena resena;

    @OneToOne(mappedBy = "reserva", fetch = FetchType.LAZY)
    @ToString.Exclude
    private Conversacion conversacion;

    @PrePersist
    void prepararCreacion() {
        LocalDateTime ahora = LocalDateTime.now(ZoneOffset.UTC);
        if (estado == null) {
            estado = EstadoReserva.PENDIENTE;
        }
        fechaCreacion = ahora;
        fechaActualizacion = ahora;
    }

    @PreUpdate
    void prepararActualizacion() {
        fechaActualizacion = LocalDateTime.now(ZoneOffset.UTC);
    }

    public LocalTime calcularHoraFin() {
        return horaInicio == null || duracionMinutos == null
                ? null : horaInicio.plusMinutes(duracionMinutos);
    }
}
