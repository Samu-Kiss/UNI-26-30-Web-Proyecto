package com.typeerror.myt.repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;

import com.typeerror.myt.entities.Cliente;
import com.typeerror.myt.entities.Estudiante;
import com.typeerror.myt.entities.Reserva;
import com.typeerror.myt.entities.Tutor;

@Repository
public class ReservaRepository {

    private final HashMap<Integer, Reserva> reservas = new HashMap<>();
    private int siguienteId = 3;

    public ReservaRepository() {
        Cliente cuentaLaura = new Cliente(1, "Laura", "Gomez", "laura.gomez@universidad.edu",
                "laura123", "3101112233", true);
        Cliente cuentaDaniel = new Cliente(2, "Daniel", "Castro", "daniel.castro@universidad.edu",
                "daniel123", "3102223344", true);
        Cliente cuentaSofia = new Cliente(3, "Sofia", "Martinez", "sofia.martinez@universidad.edu",
                "sofia123", "3103334455", true);
        Cliente cuentaMateo = new Cliente(4, "Mateo", "Ramirez", "mateo.ramirez@universidad.edu",
                "mateo123", "3104445566", true);

        Estudiante laura = new Estudiante(1, cuentaLaura, "20241001", "Universidad Nacional",
                "Ingenieria de Sistemas", 5);
        Estudiante daniel = new Estudiante(2, cuentaDaniel, "20232045", "Universidad Nacional",
                "Administracion de Empresas", 7);

        Tutor sofia = new Tutor(1, cuentaSofia, "Tutora de matematicas con tres anos de experiencia.",
                List.of("Calculo", "Algebra lineal", "Estadistica"),
                new BigDecimal("35000"), 4.8, true);
        Tutor mateo = new Tutor(2, cuentaMateo, "Tutor de programacion orientado a proyectos practicos.",
                List.of("Java", "Programacion web", "Bases de datos"),
                new BigDecimal("40000"), 4.9, true);

        Reserva reservaCalculo = new Reserva(1, laura, sofia, LocalDate.now().plusDays(2),
                LocalTime.of(16, 0), 60, "Preparacion para parcial de calculo", "CONFIRMADA",
                new BigDecimal("35000"));
        Reserva reservaJava = new Reserva(2, daniel, mateo, LocalDate.now().plusDays(4),
                LocalTime.of(10, 30), 90, "Introduccion a Java", "PENDIENTE",
                new BigDecimal("60000"));

        reservas.put(reservaCalculo.getId(), reservaCalculo);
        reservas.put(reservaJava.getId(), reservaJava);
    }

    public List<Reserva> findAll() {
        return new ArrayList<>(reservas.values());
    }

    public Optional<Reserva> findById(Integer id) {
        return Optional.ofNullable(reservas.get(id));
    }

    public Reserva save(Reserva reserva) {
        if (reserva.getId() == null) {
            reserva.setId(siguienteId++);
        } else {
            siguienteId = Math.max(siguienteId, reserva.getId() + 1);
        }

        reservas.put(reserva.getId(), reserva);
        return reserva;
    }

    public boolean deleteById(Integer id) {
        return reservas.remove(id) != null;
    }

}
