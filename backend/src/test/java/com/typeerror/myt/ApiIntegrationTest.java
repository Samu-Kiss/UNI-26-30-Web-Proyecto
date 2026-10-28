package com.typeerror.myt;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.LocalDate;
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
import com.typeerror.myt.entities.Estudiante;
import com.typeerror.myt.entities.Materia;
import com.typeerror.myt.entities.RolUsuario;
import com.typeerror.myt.entities.Tutor;
import com.typeerror.myt.entities.Usuario;
import com.typeerror.myt.entities.EstadoReserva;
import com.typeerror.myt.repository.EstudianteRepository;
import com.typeerror.myt.repository.MateriaRepository;
import com.typeerror.myt.repository.ReservaRepository;
import com.typeerror.myt.repository.TutorRepository;
import com.typeerror.myt.repository.UsuarioRepository;
import com.typeerror.myt.service.JwtSesionService;
import jakarta.persistence.EntityManager;
import jakarta.servlet.http.Cookie;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ApiIntegrationTest extends PostgreSqlIntegrationTest {
    @Autowired
    private MockMvc mvc;
    @Autowired
    private UsuarioRepository usuarios;
    @Autowired
    private TutorRepository tutores;
    @Autowired
    private MateriaRepository materias;
    @Autowired
    private ReservaRepository reservas;
    @Autowired
    private EstudianteRepository estudiantes;
    @Autowired
    private PasswordEncoder encoder;
    @Autowired
    private JwtSesionService jwt;
    @Autowired
    private EntityManager em;
    private Usuario admin;
    private Estudiante estudiante;
    private Tutor tutor;
    private Materia materia;

    @BeforeEach
    void preparar() {
        admin = cuenta("admin-api@test.edu", RolUsuario.ADMINISTRADOR);
        estudiante = estudiantes.save(new Estudiante(null, cuenta("est-api@test.edu", RolUsuario.ESTUDIANTE),
                "API-123", "Universidad", "Sistemas", 3));
        materia = materias.save(new Materia(null, "Materia API"));
        tutor = tutores.save(new Tutor(null, cuenta("tutor-api@test.edu", RolUsuario.TUTOR), "Biografia",
                Set.of(materia), new BigDecimal("50000"), true));
        em.flush();
    }

    private Usuario cuenta(String correo, RolUsuario rol) {
        Usuario u = new Usuario();
        u.setNombre("Ana");
        u.setApellido("Prueba");
        u.setCorreo(correo);
        u.setContrasena(encoder.encode("ClaveSegura123!"));
        u.setRoles(new HashSet<>(Set.of(rol)));
        return usuarios.save(u);
    }

    private Cookie cookie(String perfil) {
        return new Cookie(JwtSesionService.COOKIE, jwt.emitir(List.of(perfil), false));
    }

    private MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder request, String body, String perfil) {
        return request.contentType(MediaType.APPLICATION_JSON).header("X-MYT-Request", "1")
                .cookie(cookie(perfil)).content(body);
    }

    private String adminPerfil() {
        return "ADMINISTRADOR:" + admin.getId();
    }

    private String estudiantePerfil() {
        return "ESTUDIANTE:" + estudiante.getId();
    }

    @Test
    void documentacionPublicaSinDesprotegerLaApi() throws Exception {
        mvc.perform(get("/swagger-ui/index.html")).andExpect(status().isOk());
        mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.info.title").value("API de MyT"))
                .andExpect(jsonPath("$.paths['/api/usuarios'].get.summary").value("Listar usuarios"))
                .andExpect(jsonPath("$.paths['/api/usuarios/{id}'].get.responses['404']").exists())
                .andExpect(jsonPath("$.paths['/api/sesion/login'].post.parameters[0].name")
                        .value("X-MYT-Request"))
                .andExpect(jsonPath("$.paths['/usuarios']").doesNotExist());
        mvc.perform(get("/v3/api-docs.yaml")).andExpect(status().isOk());
        mvc.perform(get("/api/usuarios")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/usuarios/2147483647").cookie(cookie(adminPerfil())))
                .andExpect(status().isNotFound());
    }

    @Test
    void permisosDtoCsrfYOrigen() throws Exception {
        mvc.perform(get("/api/tutores")).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.mensaje").exists());
        mvc.perform(get("/api/usuarios").cookie(cookie(estudiantePerfil()))).andExpect(status().isForbidden());
        String body = mvc.perform(get("/api/usuarios").cookie(cookie(adminPerfil())))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertFalse(body.contains("contrasena"));
        assertFalse(body.contains("$2a$"));
        assertFalse(body.contains("fechaCreacion"));
        mvc.perform(delete("/api/tutores/" + tutor.getId()).cookie(cookie(adminPerfil())))
                .andExpect(status().isForbidden());
        mvc.perform(json(delete("/api/tutores/" + tutor.getId()), "", adminPerfil())
                .header("Origin", "https://evil.example")).andExpect(status().isForbidden());
        mvc.perform(json(put("/api/tutores/" + tutor.getId()),
                "{\"biografia\":\"Otro\",\"tarifaPorHora\":100,\"disponible\":true}", estudiantePerfil()))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/usuarios?sesion=" + adminPerfil())).andExpect(status().isUnauthorized());
    }

    @Test
    void loginSeleccionRecargaLogoutYPerfilFalsificado() throws Exception {
        Usuario dual = cuenta("dual@test.edu", RolUsuario.ESTUDIANTE);
        dual.getRoles().add(RolUsuario.TUTOR);
        Estudiante est = estudiantes.save(new Estudiante(null, dual, "DUAL", "U", "Sistemas", 2));
        tutores.save(new Tutor(null, dual, "Dual", Set.of(materia), BigDecimal.TEN, true));
        em.flush();
        mvc.perform(post("/api/sesion/login").contentType(MediaType.APPLICATION_JSON)
                .header("X-MYT-Request", "1").content("{\"correo\":\"dual@test.edu\",\"contrasena\":\"mal\"}"))
                .andExpect(status().isUnauthorized());
        var result = mvc.perform(post("/api/sesion/login").contentType(MediaType.APPLICATION_JSON)
                .header("X-MYT-Request", "1")
                .content("{\"correo\":\"dual@test.edu\",\"contrasena\":\"ClaveSegura123!\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.opciones.length()").value(2)).andReturn();
        Cookie seleccion = result.getResponse().getCookie(JwtSesionService.COOKIE);
        assertTrue(seleccion.isHttpOnly());
        mvc.perform(get("/api/tutores").cookie(seleccion)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/sesion/perfil").cookie(seleccion).header("X-MYT-Request", "1")
                .contentType(MediaType.APPLICATION_JSON).content("{\"perfil\":\"" + adminPerfil() + "\"}"))
                .andExpect(status().isForbidden());
        result = mvc.perform(post("/api/sesion/perfil").cookie(seleccion).header("X-MYT-Request", "1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"perfil\":\"ESTUDIANTE:" + est.getId() + "\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.actual.rol").value("ESTUDIANTE")).andReturn();
        Cookie activa = result.getResponse().getCookie(JwtSesionService.COOKIE);
        mvc.perform(get("/api/sesion").cookie(activa)).andExpect(status().isOk());
        mvc.perform(post("/api/sesion/logout").cookie(activa).header("X-MYT-Request", "1"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/sesion")).andExpect(status().isUnauthorized());
        dual.setActivo(false);
        usuarios.saveAndFlush(dual);
        mvc.perform(get("/api/sesion").cookie(activa)).andExpect(status().isUnauthorized());
    }

    @Test
    void ochoOperacionesPaginacionFiltrosPersistenciaYCancelacion() throws Exception {
        for (int i = 0; i < 6; i++) {
            tutores.save(new Tutor(null, cuenta("pagina" + i + "@test.edu", RolUsuario.TUTOR), "Pagina",
                    Set.of(materia), new BigDecimal("90000"), true));
        }
        mvc.perform(get("/api/tutores?page=0&size=5").cookie(cookie(adminPerfil())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.content.length()").value(5));
        mvc.perform(get("/api/tutores?page=1&size=5").cookie(cookie(adminPerfil())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content.length()").value(2));
        mvc.perform(get("/api/tutores?materiaId=" + materia.getId() + "&tarifaMax=60000")
                .cookie(cookie(adminPerfil()))).andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(get("/api/tutores/" + tutor.getId()).cookie(cookie(estudiantePerfil())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.nombre").value("Ana Prueba"));
        mvc.perform(get("/api/tutores/2147483647").cookie(cookie(adminPerfil())))
                .andExpect(status().isNotFound());
        Usuario nuevaCuenta = cuenta("nuevo-tutor@test.edu", RolUsuario.ESTUDIANTE);
        mvc.perform(json(post("/api/tutores"), """
                {"usuarioId":%d,"biografia":"Nuevo perfil","tarifaPorHora":20000,"materiaIds":[%d]}
                """.formatted(nuevaCuenta.getId(), materia.getId()), adminPerfil())).andExpect(status().isCreated());
        mvc.perform(json(put("/api/tutores/" + tutor.getId()),
                "{\"biografia\":\"Editada\",\"tarifaPorHora\":40000,\"disponible\":true}", adminPerfil()))
                .andExpect(status().isOk());
        em.flush();
        em.clear();
        assertEquals("Editada", tutores.findById(tutor.getId()).orElseThrow().getBiografia());
        String alta = """
                {"tutorId":%d,"materiaId":%d,"fecha":"%s","horaInicio":"10:00",
                 "duracionMinutos":60,"tema":"Prueba real","modalidad":"VIRTUAL"}
                """.formatted(tutor.getId(), materia.getId(), LocalDate.now().plusDays(7));
        mvc.perform(json(post("/api/reservas"), alta, estudiantePerfil()))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.costoTotal").value(40000));
        var reserva = reservas.buscarPorEstudiante(estudiante.getId(), EstadoReserva.PENDIENTE).getFirst();
        mvc.perform(json(put("/api/reservas/" + reserva.getId() + "/estado"),
                "{\"estado\":\"CONFIRMADA\"}", "TUTOR:" + tutor.getId())).andExpect(status().isOk());
        mvc.perform(get("/api/reservas?estado=CONFIRMADA").cookie(cookie(estudiantePerfil())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(json(delete("/api/reservas/" + reserva.getId()), "", estudiantePerfil()))
                .andExpect(status().isNoContent());
        mvc.perform(json(delete("/api/tutores/" + tutor.getId()), "", adminPerfil()))
                .andExpect(status().isNoContent());
        em.flush();
        em.clear();
        assertEquals(EstadoReserva.CANCELADA, reservas.findById(reserva.getId()).orElseThrow().getEstado());
        assertFalse(tutores.findById(tutor.getId()).orElseThrow().getDisponible());
        assertEquals(1, reservas.buscarPorEstudiante(estudiante.getId(), EstadoReserva.CANCELADA).size());
        assertTrue(tutores.findCalificacionPromedioByTutorId(tutor.getId()).isEmpty());
    }

    @Test
    void validacionConflictoYReservaAjena() throws Exception {
        mvc.perform(json(put("/api/tutores/" + tutor.getId()),
                "{\"biografia\":\"\",\"tarifaPorHora\":0,\"disponible\":true}", adminPerfil()))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.mensaje").exists());
        String alta = """
                {"usuarioId":%d,"biografia":"Duplicado","tarifaPorHora":20000,"materiaIds":[%d]}
                """.formatted(tutor.getUsuario().getId(), materia.getId());
        mvc.perform(json(post("/api/tutores"), alta, adminPerfil())).andExpect(status().isConflict());
        mvc.perform(json(post("/api/usuarios"), """
                {"nombre":"Nueva","apellido":"Cuenta","correo":"registro@test.edu",
                 "contrasena":"ClaveSegura123!","rol":"ESTUDIANTE","codigoEstudiantil":"NUEVA",
                 "universidad":"U","programaAcademico":"Sistemas","semestre":3,"roles":["ADMINISTRADOR"]}
                """, adminPerfil())).andExpect(status().isCreated());
        assertEquals(Set.of(RolUsuario.ESTUDIANTE), usuarios.findByCorreoIgnoreCase("registro@test.edu")
                .orElseThrow().getRoles());
    }

    @Test
    void rechazaReservasAjenasYTransicionesInvalidasSinCambiarLaBase() throws Exception {
        String alta = """
                {"tutorId":%d,"materiaId":%d,"fecha":"%s","horaInicio":"10:00",
                 "duracionMinutos":60,"tema":"Reserva privada","modalidad":"VIRTUAL"}
                """.formatted(tutor.getId(), materia.getId(), LocalDate.now().plusDays(8));
        mvc.perform(json(post("/api/reservas"), alta, estudiantePerfil())).andExpect(status().isCreated());
        var reserva = reservas.buscarPorEstudiante(estudiante.getId(), null).getFirst();
        var otro = estudiantes.save(new Estudiante(null, cuenta("otro@test.edu", RolUsuario.ESTUDIANTE),
                "OTRO", "Universidad", "Sistemas", 2));
        String perfilAjeno = "ESTUDIANTE:" + otro.getId();
        mvc.perform(json(delete("/api/reservas/" + reserva.getId()), "", perfilAjeno))
                .andExpect(status().isForbidden());
        mvc.perform(json(put("/api/reservas/" + reserva.getId() + "/estado"),
                "{\"estado\":\"CONFIRMADA\"}", estudiantePerfil())).andExpect(status().isForbidden());
        mvc.perform(json(put("/api/reservas/" + reserva.getId() + "/estado"),
                "{\"estado\":\"COMPLETADA\"}", "TUTOR:" + tutor.getId())).andExpect(status().isConflict());
        mvc.perform(json(post("/api/reservas"), alta, "TUTOR:" + tutor.getId()))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/reservas").cookie(cookie(perfilAjeno)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/api/reservas").cookie(cookie("TUTOR:" + tutor.getId())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get("/api/tutores?page=-1").cookie(cookie(adminPerfil())))
                .andExpect(status().isBadRequest());
        mvc.perform(json(delete("/api/reservas/2147483647"), "", adminPerfil()))
                .andExpect(status().isNotFound());
        em.flush();
        em.clear();
        assertEquals(EstadoReserva.PENDIENTE, reservas.findById(reserva.getId()).orElseThrow().getEstado());
    }
}
