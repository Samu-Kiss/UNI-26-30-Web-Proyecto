package com.typeerror.myt.entities;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class Reserva {

    private Integer id;
    private Estudiante estudiante;
    private Tutor tutor;
    private LocalDate fecha;
    private LocalTime horaInicio;
    private Integer duracionMinutos;
    private String tema;
    private String estado;
    private BigDecimal costoTotal;

}
