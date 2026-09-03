package com.typeerror.myt.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import jakarta.persistence.EntityManager;
import org.hibernate.Hibernate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import com.typeerror.myt.PostgreSqlIntegrationTest;
import com.typeerror.myt.entities.Administrador;
import com.typeerror.myt.entities.Cliente;
import com.typeerror.myt.entities.Estudiante;
import com.typeerror.myt.entities.EstadoReserva;
import com.typeerror.myt.entities.Reserva;
import com.typeerror.myt.entities.Tutor;

@DataJpaTest
class ModeloRelacionalRepositoryTest extends PostgreSqlIntegrationTest {

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private AdministradorRepository administradorRepository;

    @Autowired
    private ClienteRepository clienteRepository;

    @Autowired
    private EstudianteRepository estudianteRepository;

    @Autowired
    private TutorRepository tutorRepository;

    @Autowired
    private ReservaRepository reservaRepository;

    @Test
    void persisteTodasLasEntidadesYSusRelaciones() {
        Administrador administrador = administradorRepository.save(new Administrador(null, "Mariana", "Rojas",
                "mariana@myt.test", "hash-admin", "3001234567", true));

        Cliente clienteEstudiante = clienteRepository.save(new Cliente(null, "Laura", "Gomez",
                "laura-relacion@myt.test", "hash-estudiante", "3101112233", true));
        Cliente clienteTutor = clienteRepository.save(new Cliente(null, "Sofia", "Martinez",
                "sofia-relacion@myt.test", "hash-tutor", "3103334455", true));

        Estudiante estudiante = estudianteRepository.save(new Estudiante(null, clienteEstudiante,
                "20241001", "Universidad Nacional", "Ingenieria de Sistemas", 5));
        Tutor tutor = tutorRepository.save(new Tutor(null, clienteTutor,
                "Tutora de matematicas", List.of("Calculo", "Algebra lineal"),
                new BigDecimal("35000.00"), 4.8, true));

        Reserva reserva = reservaRepository.save(new Reserva(null, estudiante, tutor,
                LocalDate.of(2026, 9, 15), LocalTime.of(16, 0), 60,
                "Preparacion para parcial", EstadoReserva.CONFIRMADA, new BigDecimal("35000.00")));

        entityManager.flush();
        entityManager.clear();

        Reserva recargada = reservaRepository.findAll().getFirst();
        assertNotNull(administrador.getId());
        assertNotNull(reserva.getId());
        assertEquals(clienteEstudiante.getId(), recargada.getEstudiante().getCliente().getId());
        assertEquals(clienteTutor.getId(), recargada.getTutor().getCliente().getId());

        Estudiante estudianteRecargado = estudianteRepository.findOneById(estudiante.getId()).orElseThrow();
        entityManager.detach(estudianteRecargado);
        assertEquals(1, estudianteRecargado.getReservas().size());
        assertTrue(Hibernate.isInitialized(estudianteRecargado.getCliente()));
        assertTrue(Hibernate.isInitialized(estudianteRecargado.getReservas()));

        Tutor tutorRecargado = tutorRepository.findOneById(tutor.getId()).orElseThrow();
        entityManager.detach(tutorRecargado);
        assertEquals(1, tutorRecargado.getReservas().size());
        assertEquals(List.of("Calculo", "Algebra lineal"), tutorRecargado.getMaterias());
        assertTrue(Hibernate.isInitialized(tutorRecargado.getCliente()));
        assertTrue(Hibernate.isInitialized(tutorRecargado.getReservas()));
        assertTrue(Hibernate.isInitialized(tutorRecargado.getMaterias()));
    }
}
