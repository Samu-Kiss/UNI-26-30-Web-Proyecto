package com.typeerror.myt.repository;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;

import com.typeerror.myt.entities.Administrador;

@Repository
public class AdministradorRepository {

    private final HashMap<Integer, Administrador> administradores = new HashMap<>();
    private int siguienteId = 3;

    public AdministradorRepository() {
        Administrador mariana = new Administrador(1, "Mariana", "Rojas", "mariana.rojas@myt.com",
                "admin123", "3001234567", true);
        Administrador carlos = new Administrador(2, "Carlos", "Mendez", "carlos.mendez@myt.com",
                "admin456", "3017654321", true);

        administradores.put(mariana.getId(), mariana);
        administradores.put(carlos.getId(), carlos);
    }

    public List<Administrador> findAll() {
        return new ArrayList<>(administradores.values());
    }

    public Optional<Administrador> findById(Integer id) {
        return Optional.ofNullable(administradores.get(id));
    }

    public Administrador save(Administrador administrador) {
        if (administrador.getId() == null) {
            administrador.setId(siguienteId++);
        } else {
            siguienteId = Math.max(siguienteId, administrador.getId() + 1);
        }

        administradores.put(administrador.getId(), administrador);
        return administrador;
    }

    public boolean deleteById(Integer id) {
        return administradores.remove(id) != null;
    }

}
