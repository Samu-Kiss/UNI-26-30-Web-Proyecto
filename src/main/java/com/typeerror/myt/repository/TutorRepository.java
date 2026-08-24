package com.typeerror.myt.repository;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;

import com.typeerror.myt.entities.Cliente;
import com.typeerror.myt.entities.Tutor;

@Repository
public class TutorRepository {

    private final HashMap<Integer, Tutor> tutores = new HashMap<>();
    private int siguienteId = 3;

    public TutorRepository() {
        Cliente cuentaSofia = new Cliente(3, "Sofia", "Martinez", "sofia.martinez@universidad.edu",
                "sofia123", "3103334455", true);
        Cliente cuentaMateo = new Cliente(4, "Mateo", "Ramirez", "mateo.ramirez@universidad.edu",
                "mateo123", "3104445566", true);

        Tutor sofia = new Tutor(1, cuentaSofia, "Tutora de matematicas con tres anos de experiencia.",
                List.of("Calculo", "Algebra lineal", "Estadistica"),
                new BigDecimal("35000"), 4.8, true);
        Tutor mateo = new Tutor(2, cuentaMateo, "Tutor de programacion orientado a proyectos practicos.",
                List.of("Java", "Programacion web", "Bases de datos"),
                new BigDecimal("40000"), 4.9, true);

        tutores.put(sofia.getId(), sofia);
        tutores.put(mateo.getId(), mateo);
    }

    public List<Tutor> findAll() {
        return new ArrayList<>(tutores.values());
    }

    public Optional<Tutor> findById(Integer id) {
        return Optional.ofNullable(tutores.get(id));
    }

    public Tutor save(Tutor tutor) {
        if (tutor.getId() == null) {
            tutor.setId(siguienteId++);
        } else {
            siguienteId = Math.max(siguienteId, tutor.getId() + 1);
        }

        tutores.put(tutor.getId(), tutor);
        return tutor;
    }

    public boolean deleteById(Integer id) {
        return tutores.remove(id) != null;
    }

}
