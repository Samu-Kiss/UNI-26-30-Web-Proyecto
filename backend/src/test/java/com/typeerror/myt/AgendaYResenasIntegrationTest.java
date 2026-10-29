package com.typeerror.myt;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;
import com.typeerror.myt.entities.DiaSemana;
import com.typeerror.myt.entities.EstadoReserva;
import com.typeerror.myt.entities.Estudiante;
import com.typeerror.myt.entities.Materia;
import com.typeerror.myt.entities.ModalidadReserva;
import com.typeerror.myt.entities.Reserva;
import com.typeerror.myt.entities.RolUsuario;
import com.typeerror.myt.entities.Tutor;
import com.typeerror.myt.entities.Usuario;
import com.typeerror.myt.service.JwtSesionService;
import jakarta.persistence.EntityManager;
import jakarta.servlet.http.Cookie;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AgendaYResenasIntegrationTest extends PostgreSqlIntegrationTest {
    @Autowired
    private MockMvc mvc;
    @Autowired
    private EntityManager em;
    @Autowired
    private JwtSesionService jwt;
    @Autowired
    private PasswordEncoder encoder;
    private Tutor tutor;
    private Estudiante estudiante;
    private Materia materia;
    private final LocalDate fecha = LocalDate.now().plusDays(7);

    @BeforeEach
    void preparar() {
        materia = new Materia(null, "Materia de agenda");
        em.persist(materia);
        tutor = new Tutor(null, cuenta("tutor-agenda@test.edu", RolUsuario.TUTOR), "Tutor de matemáticas",
                Set.of(materia), new BigDecimal("50000"), true);
        em.persist(tutor);
        estudiante = new Estudiante(null, cuenta("est-agenda@test.edu", RolUsuario.ESTUDIANTE),
                "AGENDA-1", "Universidad", "Sistemas", 3);
        em.persist(estudiante);
        em.flush();
    }

    @Test
    void guardaConsultaModificaYEliminaAgendaConPropiedad() throws Exception {
        String url = "/api/tutores/" + tutor.getId() + "/agenda";
        String dia = DiaSemana.values()[fecha.getDayOfWeek().getValue() - 1].name();
        String agenda = """
                {"horarios":[{"diaSemana":"%s","horaInicio":"09:00","horaFin":"18:00"}],
                 "bloqueos":[{"fecha":"%s","horaInicio":"12:00","horaFin":"13:00","motivo":"Ausente"}]}
                """.formatted(dia, fecha);
        mvc.perform(json(put(url), agenda, RolUsuario.TUTOR)).andExpect(status().isOk());
        mvc.perform(get(url).cookie(cookie(RolUsuario.TUTOR)))
                .andExpect(jsonPath("$.horarios.length()").value(1))
                .andExpect(jsonPath("$.bloqueos.length()").value(1));
        mvc.perform(get(url + "/horas?fecha=" + fecha + "&duracion=120").cookie(cookie(RolUsuario.ESTUDIANTE)))
                .andExpect(status().isOk()).andExpect(jsonPath("$[-1]").value("16:00:00"));
        mvc.perform(json(put(url), "{\"horarios\":[],\"bloqueos\":[]}", RolUsuario.TUTOR))
                .andExpect(status().isOk());
        mvc.perform(get(url + "/horas?fecha=" + fecha + "&duracion=60").cookie(cookie(RolUsuario.ESTUDIANTE)))
                .andExpect(jsonPath("$.length()").value(0));
        mvc.perform(json(put(url), agenda, RolUsuario.ESTUDIANTE)).andExpect(status().isForbidden());
    }

    @Test
    void rechazaBloqueoQueAfectaReservaSinCambiarla() throws Exception {
        Reserva r = reserva(EstadoReserva.CONFIRMADA);
        String dia = DiaSemana.values()[fecha.getDayOfWeek().getValue() - 1].name();
        String agenda = """
                {"horarios":[{"diaSemana":"%s","horaInicio":"09:00","horaFin":"18:00"}],
                 "bloqueos":[{"fecha":"%s","horaInicio":"10:00","horaFin":"11:00","motivo":"Ausente"}]}
                """.formatted(dia, fecha);
        mvc.perform(json(put("/api/tutores/" + tutor.getId() + "/agenda"), agenda, RolUsuario.TUTOR))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.mensaje").exists());
        assertEquals(EstadoReserva.CONFIRMADA, r.getEstado());
    }

    @Test
    void soloEstudianteDeReservaCompletadaPuedeResenar() throws Exception {
        Reserva r = reserva(EstadoReserva.COMPLETADA);
        String alta = "{\"reservaId\":" + r.getId() + ",\"calificacion\":5,\"comentario\":\"Muy clara\"}";
        mvc.perform(json(post("/api/resenas"), alta, RolUsuario.ESTUDIANTE))
                .andExpect(status().isOk()).andExpect(jsonPath("$.calificacion").value(5));
        mvc.perform(get("/api/resenas").cookie(cookie(RolUsuario.TUTOR)))
                .andExpect(jsonPath("$.length()").value(1));
        mvc.perform(json(post("/api/resenas"), alta, RolUsuario.TUTOR)).andExpect(status().isForbidden());
    }

    @Test
    void noPermiteResenarTutoriasPendientes() throws Exception {
        Reserva r = reserva(EstadoReserva.PENDIENTE);
        String alta = "{\"reservaId\":" + r.getId() + ",\"calificacion\":5,\"comentario\":\"Muy clara\"}";
        mvc.perform(json(post("/api/resenas"), alta, RolUsuario.ESTUDIANTE)).andExpect(status().isConflict());
    }

    @Test
    void persisteMensajesSoloParaParticipantes() throws Exception {
        Reserva r = reserva(EstadoReserva.CONFIRMADA);
        String url = "/api/chat/" + r.getId();
        mvc.perform(json(post(url), "{\"contenido\":\"Repasemos el taller\"}", RolUsuario.ESTUDIANTE))
                .andExpect(status().isOk()).andExpect(jsonPath("$.contenido").value("Repasemos el taller"));
        mvc.perform(get(url).cookie(cookie(RolUsuario.TUTOR)))
                .andExpect(jsonPath("$[0].contenido").value("Repasemos el taller"));
    }

    @Test
    void validaTelefonoDePerfilYExplicaCuentaDesactivada() throws Exception {
        mvc.perform(json(put("/api/perfil"), """
                {"nombre":"Ana","apellido":"Prueba","correo":"est-agenda@test.edu","telefono":"abc123"}
                """, RolUsuario.ESTUDIANTE)).andExpect(status().isBadRequest());
        mvc.perform(json(put("/api/perfil"), """
                {"nombre":"Ana","apellido":"Prueba","correo":"est-agenda@test.edu","telefono":"+573001234567"}
                """, RolUsuario.ESTUDIANTE)).andExpect(status().isOk())
                .andExpect(jsonPath("$.telefono").value("+573001234567"));
        estudiante.getUsuario().setActivo(false);
        em.flush();
        mvc.perform(post("/api/sesion/login").header("X-MYT-Request", "1")
                .contentType(MediaType.APPLICATION_JSON).content("""
                {"correo":"est-agenda@test.edu","contrasena":"ClaveSegura123!"}
                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.mensaje").value(
                        "Tu cuenta está desactivada. Comunícate con soporte para revisar tu perfil."));
    }

    private Usuario cuenta(String correo, RolUsuario rol) {
        Usuario u = new Usuario();
        u.setNombre("Ana");
        u.setApellido("Prueba");
        u.setCorreo(correo);
        u.setContrasena(encoder.encode("ClaveSegura123!"));
        u.setRoles(new HashSet<>(Set.of(rol)));
        em.persist(u);
        return u;
    }

    private Reserva reserva(EstadoReserva estado) {
        Reserva r = new Reserva();
        r.setTutor(tutor);
        r.setEstudiante(estudiante);
        r.setMateria(materia);
        r.setFecha(fecha);
        r.setHoraInicio(LocalTime.of(10, 0));
        r.setDuracionMinutos(60);
        r.setTema("Repaso de taller");
        r.setModalidad(ModalidadReserva.VIRTUAL);
        r.setEstado(estado);
        r.setCostoTotal(new BigDecimal("50000"));
        em.persist(r);
        em.flush();
        return r;
    }

    private Cookie cookie(RolUsuario rol) {
        Integer perfilId = rol == RolUsuario.TUTOR ? tutor.getId() : estudiante.getId();
        return new Cookie(JwtSesionService.COOKIE, jwt.emitir(List.of(rol.name() + ":" + perfilId), false));
    }

    private MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder request, String body, RolUsuario rol) {
        return request.contentType(MediaType.APPLICATION_JSON).header("X-MYT-Request", "1")
                .cookie(cookie(rol)).content(body);
    }
}
