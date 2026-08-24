package com.typeerror.myt.repository;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;

import com.typeerror.myt.entities.Cliente;
import com.typeerror.myt.entities.Estudiante;

@Repository
public class EstudianteRepository {

    private final HashMap<Integer, Estudiante> estudiantes = new HashMap<>();
    private int siguienteId = 3;

    public EstudianteRepository() {
        Cliente cuentaLaura = new Cliente(1, "Laura", "Gomez", "laura.gomez@universidad.edu",
                "laura123", "3101112233", true);
        Cliente cuentaDaniel = new Cliente(2, "Daniel", "Castro", "daniel.castro@universidad.edu",
                "daniel123", "3102223344", true);

        Estudiante laura = new Estudiante(1, cuentaLaura, "20241001", "Universidad Nacional",
                "Ingenieria de Sistemas", 5);
        Estudiante daniel = new Estudiante(2, cuentaDaniel, "20232045", "Universidad Nacional",
                "Administracion de Empresas", 7);

        estudiantes.put(laura.getId(), laura);
        estudiantes.put(daniel.getId(), daniel);
    }

    public List<Estudiante> findAll() {
        return new ArrayList<>(estudiantes.values());
    }

    public Optional<Estudiante> findById(Integer id) {
        return Optional.ofNullable(estudiantes.get(id));
    }

    public Estudiante save(Estudiante estudiante) {
        if (estudiante.getId() == null) {
            estudiante.setId(siguienteId++);
        } else {
            siguienteId = Math.max(siguienteId, estudiante.getId() + 1);
        }

        estudiantes.put(estudiante.getId(), estudiante);
        return estudiante;
    }

    public boolean deleteById(Integer id) {
        return estudiantes.remove(id) != null;
    }

}
