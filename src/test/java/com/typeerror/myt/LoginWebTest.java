package com.typeerror.myt;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;
import static org.junit.jupiter.api.Assertions.assertEquals;

import java.math.BigDecimal;
import java.util.Set;
import java.util.HashSet;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.typeerror.myt.entities.RolUsuario;
import com.typeerror.myt.entities.Usuario;
import com.typeerror.myt.entities.Estudiante;
import com.typeerror.myt.entities.Tutor;
import com.typeerror.myt.repository.UsuarioRepository;
import com.typeerror.myt.repository.EstudianteRepository;
import com.typeerror.myt.repository.TutorRepository;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class LoginWebTest extends PostgreSqlIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UsuarioRepository clienteRepository;

    @Autowired
    private EstudianteRepository estudianteRepository;

    @Autowired
    private TutorRepository tutorRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void nuevoUsuarioAbreElRegistroConUnSoloBoton() throws Exception {
        String listado = mockMvc.perform(get("/usuarios"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertEquals(1, listado.split("href=\"/usuarios/nuevo\"", -1).length - 1);
        assertTrue(listado.contains(">Nuevo usuario</a>"));
        assertFalse(listado.contains("Registrar estudiante o tutor"));
        String formulario = mockMvc.perform(get("/usuarios/nuevo"))
                .andExpect(status().isOk())
                .andExpect(view().name("registro-usuario-form"))
                .andReturn().getResponse().getContentAsString();
        assertTrue(formulario.contains("action=\"/usuarios/registrar\""));
        assertTrue(formulario.contains("value=\"ESTUDIANTE\""));
        assertTrue(formulario.contains("value=\"TUTOR\""));
    }

    @Test
    void eliminaLasRutasAntiguasDeClientes() throws Exception {
        for (String ruta : new String[] {"/clientes", "/clientes/nuevo", "/clientes/editar/1"}) {
            mockMvc.perform(get(ruta)).andExpect(status().isNotFound());
        }
        for (String ruta : new String[] {"/clientes/guardar", "/clientes/1/activar", "/clientes/1/desactivar"}) {
            mockMvc.perform(post(ruta)).andExpect(status().isNotFound());
        }
        mockMvc.perform(post("/usuarios/guardar")).andExpect(status().isNotFound());
    }

    @Test
    void conservaElRegistroYElPerfilCuandoFaltanDatosAcademicos() throws Exception {
        String formulario = mockMvc.perform(post("/usuarios/registrar")
                        .param("nombre", "Nora")
                        .param("apellido", "Nueva")
                        .param("correo", "nora-invalida@myt.test")
                        .param("contrasena", "clave-dashboard")
                        .param("rol", "ESTUDIANTE"))
                .andExpect(status().isOk())
                .andExpect(view().name("registro-usuario-form"))
                .andReturn().getResponse().getContentAsString();
        assertTrue(formulario.matches(
                "(?s).*<option\\s+value=\"ESTUDIANTE\"\\s+selected=\"selected\">.*"));
        assertTrue(formulario.contains("action=\"/usuarios/registrar\""));
    }

    @Test
    void dirigeCadaRolASuPagina() throws Exception {
        Usuario administrador = clienteRepository.save(new Usuario(null, "Ana", "Admin",
                "admin-login@myt.test", passwordEncoder.encode("clave-admin"), null, true,
                new HashSet<>(Set.of(RolUsuario.ADMINISTRADOR)), null, null, null));
        Estudiante estudiante = crearEstudiante();
        Tutor tutor = crearTutor();

        mockMvc.perform(post("/login")
                        .param("correo", administrador.getCorreo())
                        .param("contrasena", "clave-admin"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/admin"));

        mockMvc.perform(post("/login")
                        .param("correo", estudiante.getUsuario().getCorreo().toUpperCase())
                        .param("contrasena", "clave-estudiante"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/tutores"));

        mockMvc.perform(post("/login")
                        .param("correo", tutor.getUsuario().getCorreo())
                        .param("contrasena", "clave-tutor"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/tutores/" + tutor.getId() + "/reservas"));
    }

    @Test
    void conservaElLoginAnteCredencialesInvalidasSinExponerElHash() throws Exception {
        Usuario cliente = clienteRepository.save(new Usuario(null, "Eva", "Error",
                "eva-login@myt.test", passwordEncoder.encode("clave-real"), null, true,
                new HashSet<>(Set.of(RolUsuario.ESTUDIANTE)), null, null, null));
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
        mockMvc.perform(post("/usuarios/registrar")
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
                .andExpect(redirectedUrl("/usuarios"));

        mockMvc.perform(post("/login")
                        .param("correo", "nora-dashboard@myt.test")
                        .param("contrasena", "clave-dashboard"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/tutores"));
    }

    @Test
    void permiteAgregarElSegundoPerfilYSeleccionarDestino() throws Exception {
        Usuario cliente = clienteRepository.save(new Usuario(null, "Carlos", "Cuenta",
                "carlos-existente@myt.test", passwordEncoder.encode("clave-existente"), null, true,
                new HashSet<>(Set.of(RolUsuario.ESTUDIANTE)), null, null, null));
        estudianteRepository.save(new Estudiante(null, cliente, "LOGIN-DOBLE",
                "Universidad de prueba", "Ingeniería", 6));

        String formulario = mockMvc.perform(get("/usuarios/{id}/perfil/nuevo", cliente.getId()))
                .andExpect(status().isOk())
                .andExpect(view().name("perfil-usuario-form"))
                .andReturn().getResponse().getContentAsString();
        assertTrue(formulario.contains("action=\"/usuarios/" + cliente.getId() + "/perfil\""));
        assertTrue(formulario.contains("value=\"TUTOR\""));
        assertFalse(formulario.contains("value=\"ESTUDIANTE\""));

        mockMvc.perform(post("/usuarios/{id}/perfil", cliente.getId())
                        .param("rol", "TUTOR")
                        .param("materias", "Cálculo, Álgebra")
                        .param("tarifaPorHora", "48000")
                        .param("biografia", "Tutor de matemáticas"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/usuarios"));

        tutorRepository.findByUsuarioId(cliente.getId()).orElseThrow();
        mockMvc.perform(post("/login")
                        .param("correo", cliente.getCorreo())
                        .param("contrasena", "clave-existente"))
                .andExpect(status().isOk())
                .andExpect(view().name("seleccionar-rol"));
    }

    private Estudiante crearEstudiante() {
        Usuario cliente = clienteRepository.save(new Usuario(null, "Estela", "Estudiante",
                "estudiante-login@myt.test", passwordEncoder.encode("clave-estudiante"), null, true,
                new HashSet<>(Set.of(RolUsuario.ESTUDIANTE)), null, null, null));
        return estudianteRepository.save(new Estudiante(null, cliente, "LOGIN-01",
                "Universidad de prueba", "Ingeniería", 4));
    }

    private Tutor crearTutor() {
        Usuario cliente = clienteRepository.save(new Usuario(null, "Tomás", "Tutor",
                "tutor-login@myt.test", passwordEncoder.encode("clave-tutor"), null, true,
                new HashSet<>(Set.of(RolUsuario.TUTOR)), null, null, null));
        return tutorRepository.save(new Tutor(null, cliente, "Tutor de prueba", Set.of(),
                new BigDecimal("45000.00"), true));
    }
}
