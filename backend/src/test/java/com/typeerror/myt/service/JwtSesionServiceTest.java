package com.typeerror.myt.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.ui.ConcurrentModel;

import com.typeerror.myt.config.SesionInterceptor;
import com.typeerror.myt.controller.LoginController;
import com.typeerror.myt.entities.RolUsuario;

import jakarta.servlet.http.Cookie;

class JwtSesionServiceTest {

    private static final String SECRET = "test-secret-with-more-than-32-bytes";
    private final JwtSesionService jwt = new JwtSesionService(SECRET, Duration.ofHours(8), true);

    @Test
    void persisteEnCookieHttpOnlyConVencimiento() {
        var response = new MockHttpServletResponse();
        jwt.guardar(response, List.of("ESTUDIANTE:7"), false);
        String cookie = response.getHeader("Set-Cookie");
        assertTrue(cookie.contains("HttpOnly"));
        assertTrue(cookie.contains("Secure"));
        assertTrue(cookie.contains("SameSite=Strict"));
        assertTrue(cookie.contains("Max-Age=28800"));
        assertEquals(List.of("ESTUDIANTE:7"), jwt.perfiles(
                request(jwt.emitir(List.of("ESTUDIANTE:7"), false)), false));
    }

    @Test
    void rechazaFirmaAlteradaYClaveDistinta() {
        String token = jwt.emitir(List.of("ADMINISTRADOR:1"), false);
        int firma = token.lastIndexOf('.') + 1;
        String alterado = token.substring(0, firma) + (token.charAt(firma) == 'A' ? 'B' : 'A')
                + token.substring(firma + 1);
        assertTrue(jwt.perfiles(request(alterado), false).isEmpty());
        var otro = new JwtSesionService("another-secret-with-more-than-32-bytes", Duration.ofHours(8), true);
        assertTrue(otro.perfiles(request(token), false).isEmpty());
        assertTrue(jwt.perfiles(request("ADMINISTRADOR:1"), false).isEmpty());
    }

    @Test
    void rechazaTokenVencido() {
        var corto = new JwtSesionService(SECRET, Duration.ofNanos(1), true);
        assertTrue(jwt.perfiles(request(corto.emitir(List.of("TUTOR:2"), false)), false).isEmpty());
    }

    @Test
    void tokenDeSeleccionNoPermiteEntrarAlMenu() {
        String token = jwt.emitir(List.of("ESTUDIANTE:7", "TUTOR:2"), true);
        assertTrue(jwt.perfiles(request(token), false).isEmpty());
        assertEquals(2, jwt.perfiles(request(token), true).size());
    }

    @Test
    void soloSeleccionaPerfilesAutenticados() {
        var sesiones = mock(SesionService.class);
        when(sesiones.resolver("TUTOR:2"))
                .thenReturn(Optional.of(new ContextoSesion(RolUsuario.TUTOR, 2, "Tutor")));
        var controller = new LoginController(mock(LoginService.class), jwt, sesiones);
        var request = request(jwt.emitir(List.of("ESTUDIANTE:7", "TUTOR:2"), true));
        assertEquals("redirect:/login", controller.seleccionarRol(
                "ADMINISTRADOR:1", request, new MockHttpServletResponse()));
        var response = new MockHttpServletResponse();
        assertEquals("redirect:/tutor", controller.seleccionarRol("TUTOR:2", request, response));
        assertTrue(response.getHeader("Set-Cookie").contains("Max-Age=28800"));
    }

    @Test
    void loginEmiteSesionYLogoutBorraCookie() {
        var login = mock(LoginService.class);
        when(login.autenticar("test@myt.test", "clave"))
                .thenReturn(List.of(new UsuarioAutenticado(RolUsuario.ESTUDIANTE, 7)));
        var controller = new LoginController(login, jwt, mock(SesionService.class));
        var response = new MockHttpServletResponse();
        assertEquals("redirect:/estudiante", controller.iniciarSesion(
                "test@myt.test", "clave", new ConcurrentModel(), response));
        assertTrue(response.getHeader("Set-Cookie").contains("HttpOnly"));
        response = new MockHttpServletResponse();
        assertEquals("redirect:/login", controller.cerrarSesion(response));
        assertTrue(response.getHeader("Set-Cookie").contains("Max-Age=0"));
    }

    @Test
    void ignoraSesionDeUrlYValidaRolContraBaseDeDatos() throws Exception {
        var sesiones = mock(SesionService.class);
        when(sesiones.resolver(null)).thenReturn(Optional.empty());
        when(sesiones.resolver("ESTUDIANTE:7"))
                .thenReturn(Optional.of(new ContextoSesion(RolUsuario.ESTUDIANTE, 7, "Estudiante")));
        var interceptor = new SesionInterceptor(sesiones, jwt);
        var request = new MockHttpServletRequest("GET", "/admin");
        request.setParameter("sesion", "ADMINISTRADOR:1");
        assertEquals(false, interceptor.preHandle(request, new MockHttpServletResponse(), new Object()));
        request.setCookies(new Cookie(JwtSesionService.COOKIE, jwt.emitir(List.of("ESTUDIANTE:7"), false)));
        assertEquals(false, interceptor.preHandle(request, new MockHttpServletResponse(), new Object()));
        request.setRequestURI("/estudiante");
        assertTrue(interceptor.preHandle(request, new MockHttpServletResponse(), new Object()));
        assertEquals("ESTUDIANTE:7", request.getAttribute("sesion"));
        when(sesiones.resolver("ESTUDIANTE:7")).thenReturn(Optional.empty());
        assertEquals(false, interceptor.preHandle(request, new MockHttpServletResponse(), new Object()));
    }

    @Test
    void requiereClaveFuerteYDuracionPositiva() {
        assertThrows(IllegalArgumentException.class,
                () -> new JwtSesionService("short", Duration.ofHours(8), true));
        assertThrows(IllegalArgumentException.class,
                () -> new JwtSesionService(SECRET, Duration.ZERO, true));
    }

    private MockHttpServletRequest request(String token) {
        var request = new MockHttpServletRequest();
        request.setCookies(new Cookie(JwtSesionService.COOKIE, token));
        return request;
    }
}
