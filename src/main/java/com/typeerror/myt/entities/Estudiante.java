package com.typeerror.myt.entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class Estudiante {

    private Integer id;
    private Cliente cliente;
    private String codigoEstudiantil;
    private String universidad;
    private String programaAcademico;
    private Integer semestre;

}
