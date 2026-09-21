package com.typeerror.myt.errors;

public class EstudianteNotFoundException extends RuntimeException{
    public EstudianteNotFoundException(Integer id) {
        super("El estudiante con ID " + id + " no fue encontrado.");
    }
}
