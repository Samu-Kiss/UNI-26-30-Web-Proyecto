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
        String sesion = sesionAdmin(crearAdministrador("admin-listado@myt.test"));
        String listado = mockMvc.perform(get("/usuarios").param("sesion", sesion))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertEquals(1, listado.split("href=\"/usuarios/nuevo\\?sesion=", -1).length - 1);
        assertTrue(listado.contains(">Nuevo usuario</a>"));
        assertFalse(listado.contains("Registrar estudiante o tutor"));
        String formulario = mockMvc.perform(get("/usuarios/nuevo").param("sesion", sesion))
                .andExpect(status().isOk())
                .andExpect(view().name("registro-usuario-form"))
                .andReturn().getResponse().getContentAsString();
        assertTrue(formulario.contains("action=\"/usuarios/registrar?sesion="));
        assertTrue(formulario.contains("value=\"ESTUDIANTE\""));
        assertTrue(formulario.contains("value=\"TUTOR\""));
    }

    @Test
    void eliminaLasRutasAntiguasDeClientes() throws Exception {
        String sesion = sesionAdmin(crearAdministrador("admin-rutas@myt.test"));
        for (String ruta : new String[] {"/clientes", "/clientes/nuevo", "/clientes/editar/1"}) {
            mockMvc.perform(get(ruta)).andExpect(status().isNotFound());
        }
        for (String ruta : new String[] {"/clientes/guardar", "/clientes/1/activar", "/clientes/1/desactivar"}) {
            mockMvc.perform(post(ruta)).andExpect(status().isNotFound());
        }
        mockMvc.perform(post("/usuarios/guardar").param("sesion", sesion))
                .andExpect(status().isNotFound());
    }

    @Test
    void conservaElRegistroYElPerfilCuandoFaltanDatosAcademicos() throws Exception {
        String sesion = sesionAdmin(crearAdministrador("admin-registro@myt.test"));
        String formulario = mockMvc.perform(post("/usuarios/registrar")
                        .param("sesion", sesion)
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
        assertTrue(formulario.contains("action=\"/usuarios/registrar?sesion="));
    }

    @Test
    void dirigeCadaRolASuPagina() throws Exception {
        Usuario administrador = crearAdministrador("admin-login@myt.test");
        Estudiante estudiante = crearEstudiante();
        Tutor tutor = crearTutor();

        mockMvc.perform(post("/login")
                        .param("correo", administrador.getCorreo())
                        .param("contrasena", "clave-admin"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/admin?sesion=ADMINISTRADOR:" + administrador.getId()));

        mockMvc.perform(post("/login")
                        .param("correo", estudiante.getUsuario().getCorreo().toUpperCase())
                        .param("contrasena", "clave-estudiante"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/estudiante?sesion=ESTUDIANTE:" + estudiante.getId()));

        mockMvc.perform(post("/login")
                        .param("correo", tutor.getUsuario().getCorreo())
                        .param("contrasena", "clave-tutor"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/tutor?sesion=TUTOR:" + tutor.getId()));
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
        Usuario administrador = crearAdministrador("admin-destinos@myt.test");
        Tutor tutor = crearTutor();

        mockMvc.perform(get("/login"))
                .andExpect(status().isOk())
                .andExpect(view().name("login"));
        mockMvc.perform(get("/admin").param("sesion", sesionAdmin(administrador)))
                .andExpect(status().isOk())
                .andExpect(view().name("menu-administrativo"));
        mockMvc.perform(get("/tutores/{tutorId}/reservas", tutor.getId())
                        .param("sesion", "TUTOR:" + tutor.getId()))
                .andExpect(status().isOk())
                .andExpect(view().name("reservas-tutor"));
    }

    @Test
    void protegeLasRutasCuandoLaSesionFaltaEsInvalidaONoCorresponde() throws Exception {
        Estudiante estudiante = crearEstudiante();
        Usuario inactivo = crearAdministrador("admin-inactivo@myt.test");
        inactivo.setActivo(false);
        clienteRepository.save(inactivo);

        mockMvc.perform(get("/admin"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login"));
        mockMvc.perform(get("/estudiante").param("sesion", "sesion-invalida"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login"));
        mockMvc.perform(get("/admin").param("sesion", "ADMINISTRADOR:999999"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login"));
        mockMvc.perform(get("/admin").param("sesion", sesionAdmin(inactivo)))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login"));
        mockMvc.perform(get("/admin")
                        .param("sesion", "ESTUDIANTE:" + estudiante.getId()))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login"));
    }

    @Test
    void conectaLosMenusConTodasLasRutasDisponibles() throws Exception {
        Usuario administrador = crearAdministrador("admin-menus@myt.test");
        Estudiante estudiante = crearEstudiante();
        Tutor tutor = crearTutor();
        String sesionAdministrador = sesionAdmin(administrador);
        String sesionEstudiante = "ESTUDIANTE:" + estudiante.getId();
        String sesionTutor = "TUTOR:" + tutor.getId();

        String menuAdministrador = mockMvc.perform(get("/admin")
                        .param("sesion", sesionAdministrador))
                .andExpect(status().isOk())
                .andExpect(view().name("menu-administrativo"))
                .andReturn().getResponse().getContentAsString();
        assertTrue(menuAdministrador.contains(">Clientes</a>"));

        String menuEstudiante = mockMvc.perform(get("/estudiante")
                        .param("sesion", sesionEstudiante))
                .andExpect(status().isOk())
                .andExpect(view().name("menu-estudiante"))
                .andReturn().getResponse().getContentAsString();
        assertTrue(menuEstudiante.contains("Consultar tutores"));
        assertTrue(menuEstudiante.contains("Crear reserva"));
        assertTrue(menuEstudiante.contains("Mis tutorías"));

        mockMvc.perform(get("/tutores").param("sesion", sesionEstudiante))
                .andExpect(status().isOk());
        mockMvc.perform(get("/estudiantes/{id}/reservas", estudiante.getId())
                        .param("sesion", sesionEstudiante))
                .andExpect(status().isOk())
                .andExpect(view().name("reservas-estudiante"));

        String menuTutor = mockMvc.perform(get("/tutor").param("sesion", sesionTutor))
                .andExpect(status().isOk())
                .andExpect(view().name("menu-tutor"))
                .andReturn().getResponse().getContentAsString();
        assertTrue(menuTutor.contains("Mis reservas"));
        mockMvc.perform(get("/tutores/{id}/reservas", tutor.getId())
                        .param("sesion", sesionTutor))
                .andExpect(status().isOk());

        for (String ruta : new String[] {
            "/usuarios", "/estudiantes", "/tutores", "/reservas", "/administradores"
        }) {
            mockMvc.perform(get(ruta).param("sesion", sesionAdministrador))
                    .andExpect(status().isOk());
        }
    }

    @Test
    void clienteCreadoDesdeElDashboardPuedeIniciarSesion() throws Exception {
        String sesion = sesionAdmin(crearAdministrador("admin-dashboard@myt.test"));
        mockMvc.perform(post("/usuarios/registrar")
                        .param("sesion", sesion)
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
                .andExpect(redirectedUrl("/usuarios?sesion=" + sesion));

        mockMvc.perform(post("/login")
                        .param("correo", "nora-dashboard@myt.test")
                        .param("contrasena", "clave-dashboard"))
                .andExpect(status().is3xxRedirection())
                .andExpect(result -> assertTrue(result.getResponse().getRedirectedUrl()
                        .startsWith("/estudiante?sesion=ESTUDIANTE:")));
    }

    @Test
    void permiteAgregarElSegundoPerfilYSeleccionarDestino() throws Exception {
        String sesion = sesionAdmin(crearAdministrador("admin-perfiles@myt.test"));
        Usuario cliente = clienteRepository.save(new Usuario(null, "Carlos", "Cuenta",
                "carlos-existente@myt.test", passwordEncoder.encode("clave-existente"), null, true,
                new HashSet<>(Set.of(RolUsuario.ESTUDIANTE)), null, null, null));
        estudianteRepository.save(new Estudiante(null, cliente, "LOGIN-DOBLE",
                "Universidad de prueba", "Ingeniería", 6));

        String formulario = mockMvc.perform(get("/usuarios/{id}/perfil/nuevo", cliente.getId())
                        .param("sesion", sesion))
                .andExpect(status().isOk())
                .andExpect(view().name("perfil-usuario-form"))
                .andReturn().getResponse().getContentAsString();
        assertTrue(formulario.contains("action=\"/usuarios/" + cliente.getId()
                + "/perfil?sesion="));
        assertTrue(formulario.contains("value=\"TUTOR\""));
        assertFalse(formulario.contains("value=\"ESTUDIANTE\""));

        mockMvc.perform(post("/usuarios/{id}/perfil", cliente.getId())
                        .param("sesion", sesion)
                        .param("rol", "TUTOR")
                        .param("materias", "Cálculo, Álgebra")
                        .param("tarifaPorHora", "48000")
                        .param("biografia", "Tutor de matemáticas"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/usuarios?sesion=" + sesion));

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

    private Usuario crearAdministrador(String correo) {
        return clienteRepository.save(new Usuario(null, "Ana", "Admin", correo,
                passwordEncoder.encode("clave-admin"), null, true,
                new HashSet<>(Set.of(RolUsuario.ADMINISTRADOR)), null, null, null));
    }

    private String sesionAdmin(Usuario administrador) {
        return "ADMINISTRADOR:" + administrador.getId();
    }

    private Tutor crearTutor() {
        Usuario cliente = clienteRepository.save(new Usuario(null, "Tomás", "Tutor",
                "tutor-login@myt.test", passwordEncoder.encode("clave-tutor"), null, true,
                new HashSet<>(Set.of(RolUsuario.TUTOR)), null, null, null));
        return tutorRepository.save(new Tutor(null, cliente, "Tutor de prueba", Set.of(),
                new BigDecimal("45000.00"), true));
    }
}
