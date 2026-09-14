package com.typeerror.myt;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.typeerror.myt.entities.Administrador;
import com.typeerror.myt.entities.Cliente;
import com.typeerror.myt.entities.Estudiante;
import com.typeerror.myt.entities.Tutor;
import com.typeerror.myt.repository.AdministradorRepository;
import com.typeerror.myt.repository.ClienteRepository;
import com.typeerror.myt.repository.EstudianteRepository;
import com.typeerror.myt.repository.TutorRepository;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class LoginWebTest extends PostgreSqlIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AdministradorRepository administradorRepository;

    @Autowired
    private ClienteRepository clienteRepository;

    @Autowired
    private EstudianteRepository estudianteRepository;

    @Autowired
    private TutorRepository tutorRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void dirigeCadaRolASuPagina() throws Exception {
        Administrador administrador = administradorRepository.save(new Administrador(null, "Ana", "Admin",
                "admin-login@myt.test", passwordEncoder.encode("clave-admin"), null, true));
        Estudiante estudiante = crearEstudiante();
        Tutor tutor = crearTutor();

        mockMvc.perform(post("/login")
                        .param("correo", administrador.getCorreo())
                        .param("contrasena", "clave-admin"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/admin"));

        mockMvc.perform(post("/login")
                        .param("correo", estudiante.getCliente().getCorreo().toUpperCase())
                        .param("contrasena", "clave-estudiante"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/tutores"));

        mockMvc.perform(post("/login")
                        .param("correo", tutor.getCliente().getCorreo())
                        .param("contrasena", "clave-tutor"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/tutores/" + tutor.getId() + "/reservas"));
    }

    @Test
    void conservaElLoginAnteCredencialesInvalidasSinExponerElHash() throws Exception {
        Cliente cliente = clienteRepository.save(new Cliente(null, "Eva", "Error",
                "eva-login@myt.test", passwordEncoder.encode("clave-real"), null, true));
        estudianteRepository.save(new Estudiante(null, cliente, "LOGIN-02",
                "Universidad de prueba", "Matemáticas", 3));

        String respuesta = mockMvc.perform(post("/login")
                        .param("correo", cliente.getCorreo())
                        .param("contrasena", "clave-incorrecta"))
                .andExpect(status().isOk())
                .andExpect(view().name("login"))
                .andReturn().getResponse().getContentAsString();

        assertTrue(respuesta.contains(cliente.getCorreo()));
        assertTrue(respuesta.contains("Correo o contraseña incorrectos"));
        assertFalse(respuesta.contains(cliente.getContrasena()));
        assertFalse(respuesta.contains("clave-incorrecta"));
    }

    @Test
    void publicaElFormularioYLasPaginasDeDestino() throws Exception {
        Tutor tutor = crearTutor();

        mockMvc.perform(get("/login"))
                .andExpect(status().isOk())
                .andExpect(view().name("login"));
        mockMvc.perform(get("/admin"))
                .andExpect(status().isOk())
                .andExpect(view().name("menu-administrativo"));
        mockMvc.perform(get("/tutores/{tutorId}/reservas", tutor.getId()))
                .andExpect(status().isOk())
                .andExpect(view().name("reservas-tutor"));
    }

    @Test
    void clienteCreadoDesdeElDashboardPuedeIniciarSesion() throws Exception {
        mockMvc.perform(post("/clientes/guardar")
                        .param("nombre", "Nora")
                        .param("apellido", "Nueva")
                        .param("correo", "nora-dashboard@myt.test")
                        .param("contrasena", "clave-dashboard")
                        .param("telefono", "3100000000")
                        .param("rol", "ESTUDIANTE")
                        .param("codigoEstudiantil", "LOGIN-DASHBOARD")
                        .param("universidad", "Universidad de prueba")
                        .param("programaAcademico", "Ingeniería")
                        .param("semestre", "6"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/clientes"));

        mockMvc.perform(post("/login")
                        .param("correo", "nora-dashboard@myt.test")
                        .param("contrasena", "clave-dashboard"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/tutores"));
    }

    @Test
    void permiteAsignarPerfilAUnClienteExistente() throws Exception {
        Cliente cliente = clienteRepository.save(new Cliente(null, "Carlos", "Cuenta",
                "carlos-existente@myt.test", passwordEncoder.encode("clave-existente"), null, true));

        mockMvc.perform(post("/clientes/guardar")
                        .param("id", cliente.getId().toString())
                        .param("nombre", cliente.getNombre())
                        .param("apellido", cliente.getApellido())
                        .param("correo", cliente.getCorreo())
                        .param("contrasena", "")
                        .param("telefono", "")
                        .param("rol", "TUTOR")
                        .param("materias", "Cálculo, Álgebra")
                        .param("tarifaPorHora", "48000")
                        .param("biografia", "Tutor de matemáticas"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/clientes"));

        Tutor tutor = tutorRepository.findByClienteId(cliente.getId()).orElseThrow();
        mockMvc.perform(post("/login")
                        .param("correo", cliente.getCorreo())
                        .param("contrasena", "clave-existente"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/tutores/" + tutor.getId() + "/reservas"));
    }

    private Estudiante crearEstudiante() {
        Cliente cliente = clienteRepository.save(new Cliente(null, "Estela", "Estudiante",
                "estudiante-login@myt.test", passwordEncoder.encode("clave-estudiante"), null, true));
        return estudianteRepository.save(new Estudiante(null, cliente, "LOGIN-01",
                "Universidad de prueba", "Ingeniería", 4));
    }

    private Tutor crearTutor() {
        Cliente cliente = clienteRepository.save(new Cliente(null, "Tomás", "Tutor",
                "tutor-login@myt.test", passwordEncoder.encode("clave-tutor"), null, true));
        return tutorRepository.save(new Tutor(null, cliente, "Tutor de prueba", List.of("Cálculo"),
                new BigDecimal("45000.00"), 4.9, true));
    }
}
