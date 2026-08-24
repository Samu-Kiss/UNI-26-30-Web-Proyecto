package com.typeerror.myt.entities;

import java.math.BigDecimal;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class Tutor {

    private Integer id;
    private Cliente cliente;
    private String biografia;
    private List<String> materias;
    private BigDecimal tarifaPorHora;
    private Double calificacionPromedio;
    private Boolean disponible;

}