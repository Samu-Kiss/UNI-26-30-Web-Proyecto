package com.typeerror.myt.errors;

public class MateriaNotFoundException extends RuntimeException {
    public MateriaNotFoundException(Integer id) {
        super("La materia con ID " + id + " no fue encontrada.");
    }
}
