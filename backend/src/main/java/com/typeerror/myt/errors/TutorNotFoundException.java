package com.typeerror.myt.errors;

public class TutorNotFoundException extends RuntimeException {
    public TutorNotFoundException(Integer id) {
        super("El tutor con ID " + id + " no fue encontrado.");
    }
}
