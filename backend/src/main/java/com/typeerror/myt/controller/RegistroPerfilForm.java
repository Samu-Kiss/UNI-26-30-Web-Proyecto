package com.typeerror.myt.controller;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RegistroPerfilForm {

    private String rol;
    private String codigoEstudiantil;
    private String universidad;
    private String programaAcademico;
    private String semestre;
    private String biografia;
    private String materias;
    private String tarifaPorHora;
}
