package com.typeerror.myt.repository;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;

import com.typeerror.myt.entities.Cliente;

@Repository
public class ClienteRepository {

    private final HashMap<Integer, Cliente> clientes = new HashMap<>();
    private int siguienteId = 5;

    public ClienteRepository() {
        Cliente laura = new Cliente(1, "Laura", "Gomez", "laura.gomez@universidad.edu",
                "laura123", "3101112233", true);
        Cliente daniel = new Cliente(2, "Daniel", "Castro", "daniel.castro@universidad.edu",
                "daniel123", "3102223344", true);
        Cliente sofia = new Cliente(3, "Sofia", "Martinez", "sofia.martinez@universidad.edu",
                "sofia123", "3103334455", true);
        Cliente mateo = new Cliente(4, "Mateo", "Ramirez", "mateo.ramirez@universidad.edu",
                "mateo123", "3104445566", true);

        clientes.put(laura.getId(), laura);
        clientes.put(daniel.getId(), daniel);
        clientes.put(sofia.getId(), sofia);
        clientes.put(mateo.getId(), mateo);
    }

    public List<Cliente> findAll() {
        return new ArrayList<>(clientes.values());
    }

    public Optional<Cliente> findById(Integer id) {
        return Optional.ofNullable(clientes.get(id));
    }

    public Cliente save(Cliente cliente) {
        if (cliente.getId() == null) {
            cliente.setId(siguienteId++);
        } else {
            siguienteId = Math.max(siguienteId, cliente.getId() + 1);
        }

        clientes.put(cliente.getId(), cliente);
        return cliente;
    }

    public boolean deleteById(Integer id) {
        return clientes.remove(id) != null;
    }

}
