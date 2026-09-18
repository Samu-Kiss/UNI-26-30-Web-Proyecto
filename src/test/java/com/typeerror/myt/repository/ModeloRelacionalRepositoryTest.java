package com.typeerror.myt.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Set;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import com.typeerror.myt.PostgreSqlIntegrationTest;
import com.typeerror.myt.entities.Conversacion;
import com.typeerror.myt.entities.DiaSemana;
import com.typeerror.myt.entities.DisponibilidadTutor;
import com.typeerror.myt.entities.EstadoReserva;
import com.typeerror.myt.entities.Estudiante;
import com.typeerror.myt.entities.Materia;
import com.typeerror.myt.entities.Mensaje;
import com.typeerror.myt.entities.ModalidadReserva;
import com.typeerror.myt.entities.Resena;
import com.typeerror.myt.entities.Reserva;
import com.typeerror.myt.entities.RolUsuario;
import com.typeerror.myt.entities.Tutor;
import com.typeerror.myt.entities.Usuario;

@DataJpaTest
class ModeloRelacionalRepositoryTest extends PostgreSqlIntegrationTest {

    @Autowired
    private EntityManager entityManager;
    @Autowired
    private UsuarioRepository usuarioRepository;
    @Autowired
    private EstudianteRepository estudianteRepository;
    @Autowired
    private TutorRepository tutorRepository;
    @Autowired
    private ReservaRepository reservaRepository;
    @Autowired
    private ResenaRepository resenaRepository;
    @Autowired
    private ConversacionRepository conversacionRepository;
    @Autowired
    private MensajeRepository mensajeRepository;

    @Test
    void persisteElModeloCompletoIncluidoElChat() {
        Usuario cuentaEstudiante = usuarioRepository.save(usuario(
                "estudiante@myt.test", RolUsuario.ESTUDIANTE));
        Usuario cuentaTutor = usuarioRepository.save(usuario("tutor@myt.test", RolUsuario.TUTOR));

        Estudiante estudiante = new Estudiante(null, cuentaEstudiante, "EST-10",
                "Universidad", "Sistemas", 5);
        estudianteRepository.save(estudiante);

        Materia materia = new Materia(null, "Calculo");
        entityManager.persist(materia);
        Tutor tutor = new Tutor(null, cuentaTutor, "Tutor de calculo", Set.of(materia),
                new BigDecimal("50000"), true);
        tutorRepository.save(tutor);

        DisponibilidadTutor disponibilidad = new DisponibilidadTutor(null, tutor, DiaSemana.LUNES,
                LocalTime.of(8, 0), LocalTime.of(12, 0));
        entityManager.persist(disponibilidad);

        Reserva reserva = reserva(estudiante, tutor, materia);
        reservaRepository.save(reserva);
        Resena resena = new Resena(null, reserva, 5, "Excelente", null);
        resenaRepository.save(resena);
        Conversacion conversacion = conversacionRepository.save(new Conversacion(reserva));
        Mensaje mensaje = mensajeRepository.save(new Mensaje(conversacion, cuentaEstudiante, "Hola"));

        entityManager.flush();
        entityManager.clear();

        Reserva recargada = reservaRepository.findOneById(reserva.getId()).orElseThrow();
        assertEquals("Calculo", recargada.getMateria().getNombre());
        assertNotNull(recargada.getFechaCreacion());
        assertNotNull(resenaRepository.findByReservaId(reserva.getId()).orElseThrow().getFechaCreacion());
        assertEquals(1, mensajeRepository.findByConversacionIdOrderByFechaEnvioAsc(
                conversacion.getId()).size());
        assertNotNull(mensaje.getFechaEnvio());
        assertTrue(disponibilidad.tieneHorarioValido());
    }

    private Usuario usuario(String correo, RolUsuario rol) {
        Usuario usuario = new Usuario();
        usuario.setNombre("Nombre");
        usuario.setApellido("Apellido");
        usuario.setCorreo(correo);
        usuario.setContrasena("hash");
        usuario.setRoles(Set.of(rol));
        return usuario;
    }

    private Reserva reserva(Estudiante estudiante, Tutor tutor, Materia materia) {
        Reserva reserva = new Reserva();
        reserva.setEstudiante(estudiante);
        reserva.setTutor(tutor);
        reserva.setMateria(materia);
        reserva.setFecha(LocalDate.of(2026, 9, 21));
        reserva.setHoraInicio(LocalTime.of(9, 0));
        reserva.setDuracionMinutos(60);
        reserva.setTema("Limites");
        reserva.setModalidad(ModalidadReserva.VIRTUAL);
        reserva.setUbicacionOEnlace("https://meet.example.test/1");
        reserva.setEstado(EstadoReserva.COMPLETADA);
        reserva.setCostoTotal(new BigDecimal("50000"));
        reserva.setMoneda("COP");
        return reserva;
    }
}
