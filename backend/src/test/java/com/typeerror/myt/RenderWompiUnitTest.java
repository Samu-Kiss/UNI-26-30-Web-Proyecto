package com.typeerror.myt;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Properties;

import javax.sql.DataSource;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import org.springframework.beans.factory.support.RootBeanDefinition;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.server.ResponseStatusException;

import com.typeerror.myt.api.ApiInterceptor;
import com.typeerror.myt.api.SaludRestController;
import com.typeerror.myt.config.EsquemaBaseDatosConfig;
import com.typeerror.myt.config.SecurityConfig;
import com.typeerror.myt.entities.EstadoReserva;
import com.typeerror.myt.entities.Estudiante;
import com.typeerror.myt.entities.Materia;
import com.typeerror.myt.entities.ModalidadReserva;
import com.typeerror.myt.entities.Reserva;
import com.typeerror.myt.entities.RolUsuario;
import com.typeerror.myt.entities.Tutor;
import com.typeerror.myt.entities.Usuario;
import com.typeerror.myt.pagos.PagoController;
import com.typeerror.myt.pagos.WompiService;
import com.typeerror.myt.service.ContextoSesion;
import com.typeerror.myt.service.JwtSesionService;
import com.typeerror.myt.service.ReservaService;
import com.typeerror.myt.service.SesionService;

import tools.jackson.databind.ObjectMapper;

class RenderWompiUnitTest {

    @Test
    void normalizaUrlsDeRenderEnFormatosPostgresYDatabaseUrl() {
        Properties props1 = new Properties();
        MyTApplication.normalizarPropiedadesRender(
                Map.of("SPRING_DATASOURCE_URL",
                        "postgresql://myt_user:Clave%21123@dpg-dbovj9bncjis73a4erh0-a/myt_db"),
                props1);
        assertEquals("jdbc:postgresql://dpg-dbovj9bncjis73a4erh0-a:5432/myt_db",
                props1.getProperty("spring.datasource.url"));
        assertEquals("myt_user", props1.getProperty("spring.datasource.username"));
        assertEquals("Clave!123", props1.getProperty("spring.datasource.password"));

        Properties props2 = new Properties();
        MyTApplication.normalizarPropiedadesRender(
                Map.of("DATABASE_URL",
                        "postgres://admin:secret@dpg-host.oregon-postgres.render.com:5433/appdb?sslmode=require"),
                props2);
        assertEquals("jdbc:postgresql://dpg-host.oregon-postgres.render.com:5433/appdb?sslmode=require",
                props2.getProperty("spring.datasource.url"));
        assertEquals("admin", props2.getProperty("spring.datasource.username"));
        assertEquals("secret", props2.getProperty("spring.datasource.password"));

        // Si ya es jdbc:postgresql:// sin credenciales embebidas, no sobreescribe
        Properties props3 = new Properties();
        MyTApplication.normalizarPropiedadesRender(
                Map.of("SPRING_DATASOURCE_URL", "jdbc:postgresql://dpg-host:5432/myt_db"),
                props3);
        assertFalse(props3.containsKey("spring.datasource.url"));

        // Respeta credenciales explícitas en entorno
        Properties props4 = new Properties();
        MyTApplication.normalizarPropiedadesRender(
                Map.of(
                        "SPRING_DATASOURCE_URL", "jdbc:postgresql://u1:p1@dpg-host:5432/myt_db",
                        "SPRING_DATASOURCE_USERNAME", "explicito",
                        "SPRING_DATASOURCE_PASSWORD", "clave_explicita"),
                props4);
        assertEquals("jdbc:postgresql://dpg-host:5432/myt_db",
                props4.getProperty("spring.datasource.url"));
        assertFalse(props4.containsKey("spring.datasource.username"));
        assertFalse(props4.containsKey("spring.datasource.password"));

        // También normaliza si se configuró en SUPABASE_DEV_DB_URL o SUPABASE_PROD_DB_URL
        Properties props5 = new Properties();
        MyTApplication.normalizarPropiedadesRender(
                Map.of(
                        "SUPABASE_DEV_DB_URL", "postgres://render_u:render_p@dpg-dev:5432/render_db",
                        "SUPABASE_DEV_DB_USERNAME", "render_u",
                        "SUPABASE_DEV_DB_PASSWORD", "render_p"),
                props5);
        assertEquals("jdbc:postgresql://dpg-dev:5432/render_db",
                props5.getProperty("spring.datasource.url"));
        assertEquals("jdbc:postgresql://dpg-dev:5432/render_db",
                props5.getProperty("SUPABASE_DEV_DB_URL"));

        assertDoesNotThrow(() -> MyTApplication.normalizarPropiedadesRender(null, null));
        assertDoesNotThrow(() -> MyTApplication.normalizarPropiedadesRender(Map.of(), new Properties()));
    }

    @Test
    void sincronizaEsquemaIncrementalYBaseAntesDeEntityManagerFactory() throws Exception {
        DefaultListableBeanFactory beanFactory = new DefaultListableBeanFactory();
        beanFactory.registerBeanDefinition(
                EsquemaBaseDatosConfig.BEAN_INITIALIZER,
                new RootBeanDefinition(Boolean.class));
        RootBeanDefinition emfDef = new RootBeanDefinition(Object.class);
        emfDef.setDependsOn("otroBean");
        beanFactory.registerBeanDefinition("entityManagerFactory", emfDef);

        EsquemaBaseDatosConfig.dependenciaEsquemaEntityManagerFactory()
                .postProcessBeanFactory(beanFactory);
        List<String> dependsOn = List.of(beanFactory.getBeanDefinition("entityManagerFactory").getDependsOn());
        assertTrue(dependsOn.contains("otroBean"));
        assertTrue(dependsOn.contains(EsquemaBaseDatosConfig.BEAN_INITIALIZER));

        EsquemaBaseDatosConfig config = new EsquemaBaseDatosConfig();
        DataSource dataSource = mock(DataSource.class);
        Connection connection = mock(Connection.class);
        PreparedStatement ps = mock(PreparedStatement.class);
        ResultSet rs = mock(ResultSet.class);
        Statement statement = mock(Statement.class);

        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.prepareStatement(anyString())).thenReturn(ps);
        when(ps.executeQuery()).thenReturn(rs);
        when(connection.createStatement()).thenReturn(statement);

        // Cuando ddl-auto es create-drop no ejecuta migraciones manuales
        config.sincronizarEsquema(dataSource, "public", "create-drop");
        verify(dataSource, never()).getConnection();

        // Cuando la tabla app.usuarios aún no existe (primera llamada false, segunda true),
        // aplica migraciones base y luego incrementales
        when(rs.next()).thenReturn(true);
        when(rs.getString(1)).thenReturn(null, "app.usuarios");

        @SuppressWarnings("unchecked")
        ObjectProvider<DataSource> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(dataSource);

        assertTrue(config.esquemaBaseDatosInitializer(provider, "app", "validate"));
        verify(statement, atLeastOnce()).execute(anyString());

        // Si ocurre SQLException, la captura sin abortar el arranque
        DataSource failingDs = mock(DataSource.class);
        when(failingDs.getConnection()).thenThrow(new SQLException("DB offline"));
        assertDoesNotThrow(() -> config.sincronizarEsquema(failingDs, "app", "validate"));
    }

    @Test
    void permiteGetYHeadEnSaludYResuelveOrigenesCors() throws Exception {
        var origenes = SecurityConfig.resolverOrigenesPermitidos("https://myt-front.onrender.com///");
        assertEquals(List.of("http://localhost:4200", "https://myt-front.onrender.com"), origenes);

        var multiples = SecurityConfig.resolverOrigenesPermitidos(
                "https://myt-frontend.vercel.app/, https://myt-front.onrender.com///");
        assertEquals(
                List.of("http://localhost:4200", "https://myt-frontend.vercel.app", "https://myt-front.onrender.com"),
                multiples);

        var patrones = SecurityConfig.resolverPatronesOrigenPermitidos("https://myt-frontend.vercel.app/");
        assertTrue(patrones.contains("https://*.vercel.app"));
        assertTrue(patrones.contains("https://*.onrender.com"));
        assertTrue(patrones.contains("https://myt-frontend.vercel.app"));

        JwtSesionService jwtCrossSite = new JwtSesionService(
                "secreto-de-prueba-con-mas-de-32-bytes-seguros",
                java.time.Duration.ofHours(8),
                true,
                "None");
        MockHttpServletResponse cookieRes = new MockHttpServletResponse();
        jwtCrossSite.guardar(cookieRes, List.of("ESTUDIANTE:1"), false);
        assertTrue(cookieRes.getHeader("Set-Cookie").contains("SameSite=None"));

        JwtSesionService jwtBlankSameSite = new JwtSesionService(
                "secreto-de-prueba-con-mas-de-32-bytes-seguros",
                java.time.Duration.ofHours(8),
                true,
                "  ");
        MockHttpServletResponse strictRes = new MockHttpServletResponse();
        jwtBlankSameSite.guardar(strictRes, List.of("ESTUDIANTE:1"), false);
        assertTrue(strictRes.getHeader("Set-Cookie").contains("SameSite=Strict"));

        ApiInterceptor interceptor = new ApiInterceptor(
                mock(JwtSesionService.class), mock(SesionService.class));
        MockHttpServletRequest getSalud = new MockHttpServletRequest("GET", "/api/salud");
        MockHttpServletRequest headSalud = new MockHttpServletRequest("HEAD", "/api/salud");
        MockHttpServletResponse response = new MockHttpServletResponse();
        assertTrue(interceptor.preHandle(getSalud, response, new Object()));
        assertTrue(interceptor.preHandle(headSalud, response, new Object()));

        JdbcClient jdbc = mock(JdbcClient.class);
        JdbcClient.StatementSpec spec = mock(JdbcClient.StatementSpec.class);
        @SuppressWarnings("unchecked")
        JdbcClient.MappedQuerySpec<Integer> mapped = mock(JdbcClient.MappedQuerySpec.class);
        when(jdbc.sql(anyString())).thenReturn(spec);
        when(spec.query(Integer.class)).thenReturn(mapped);
        when(mapped.optional()).thenReturn(Optional.of(1));

        SaludRestController saludCtrl = new SaludRestController(jdbc, "app");
        assertEquals(Map.of("estado", "ok"), saludCtrl.salud());
    }

    @Test
    void wompiServiceGeneraUrlsCheckoutYValidaFirmasWebhook() throws Exception {
        WompiService deshabilitado = new WompiService("", "", "", "", "http://localhost:4200");
        assertFalse(deshabilitado.habilitado());

        WompiService wompiLocal = new WompiService(
                "pub_test_123",
                "prv_test_123",
                "test_integrity_secret",
                "test_events_secret",
                "http://localhost:4200/");
        assertTrue(wompiLocal.habilitado());

        String urlLocal = wompiLocal.checkout("ORD-1", 1_500_000L);
        assertTrue(urlLocal.startsWith("https://checkout.wompi.co/p/?"));
        assertFalse(urlLocal.contains("redirect-url"));

        WompiService wompiRemoto = new WompiService(
                "pub_test_123",
                "prv_test_123",
                "test_integrity_secret",
                "test_events_secret",
                "https://myt.onrender.com");
        String urlRemota = wompiRemoto.checkout("ORD-1", 1_500_000L);
        assertTrue(urlRemota.contains("redirect-url="));

        ObjectMapper mapper = new ObjectMapper();
        String checksum = sha256("tx-99APPROVED15000001700000000test_events_secret");
        var eventoValido = mapper.readTree("""
                {
                  "event": "transaction.updated",
                  "data": {
                    "transaction": {
                      "id": "tx-99",
                      "status": "APPROVED",
                      "amount_in_cents": 1500000
                    }
                  },
                  "timestamp": 1700000000,
                  "signature": {
                    "properties": ["transaction.id", "transaction.status", "transaction.amount_in_cents"],
                    "checksum": "%s"
                  }
                }
                """.formatted(checksum));
        assertTrue(wompiLocal.firmaValida(eventoValido));

        var eventoInvalido = mapper.readTree("""
                {
                  "event": "transaction.updated",
                  "data": { "transaction": { "id": "tx-99" } },
                  "timestamp": 1700000000,
                  "signature": {
                    "properties": ["transaction.id"],
                    "checksum": "0000"
                  }
                }
                """);
        assertFalse(wompiLocal.firmaValida(eventoInvalido));
        assertFalse(deshabilitado.firmaValida(eventoValido));
    }

    @Test
    void pagoControllerValidaCheckoutWebhookYConsultas() throws Exception {
        WompiService wompi = mock(WompiService.class);
        JdbcClient db = mock(JdbcClient.class);
        JdbcClient.StatementSpec spec = mock(
                JdbcClient.StatementSpec.class, org.mockito.Mockito.RETURNS_SELF);
        ReservaService reservas = mock(ReservaService.class);

        when(db.sql(anyString())).thenReturn(spec);
        when(spec.update()).thenReturn(1);

        PagoController ctrl = new PagoController(wompi, db, reservas, "app");

        when(wompi.habilitado()).thenReturn(false);
        assertEquals(false, ctrl.configuracion().get("habilitado"));
        ContextoSesion sesionEst = new ContextoSesion(RolUsuario.ESTUDIANTE, 10, "Sofía");
        assertThrows(ResponseStatusException.class,
                () -> ctrl.checkout(sesionEst, new PagoController.CheckoutSolicitud(null)));

        when(wompi.habilitado()).thenReturn(true);
        when(wompi.checkout(anyString(), org.mockito.ArgumentMatchers.anyLong()))
                .thenReturn("https://checkout.wompi.co/p/?reference=ORD-1");

        // Abono general sin reserva
        Map<String, Object> abono = ctrl.checkout(sesionEst, null);
        assertEquals(1_500_000L, abono.get("montoEnCentavos"));
        assertNotNull(abono.get("referencia"));

        // Pago de reserva propia válida
        Usuario uEst = new Usuario();
        uEst.setId(1);
        uEst.setNombre("Sofía");
        Estudiante est = new Estudiante(10, uEst, "COD", "Uni", "Ing", 3);
        Usuario uTut = new Usuario();
        uTut.setId(2);
        uTut.setNombre("Carlos");
        Tutor tutor = new Tutor(20, uTut, "Bio", java.util.Set.of(), new BigDecimal("40000"), true);
        Materia materia = new Materia(5, "Cálculo");
        Reserva reserva = new Reserva();
        reserva.setId(77);
        reserva.setEstudiante(est);
        reserva.setTutor(tutor);
        reserva.setMateria(materia);
        reserva.setFecha(LocalDate.now().plusDays(1));
        reserva.setHoraInicio(LocalTime.of(10, 0));
        reserva.setDuracionMinutos(60);
        reserva.setTema("Integrales");
        reserva.setModalidad(ModalidadReserva.VIRTUAL);
        reserva.setEstado(EstadoReserva.PENDIENTE);
        reserva.setCostoTotal(new BigDecimal("40000"));

        when(reservas.findById(77)).thenReturn(Optional.of(reserva));
        @SuppressWarnings("unchecked")
        JdbcClient.MappedQuerySpec<Object> queryMock = mock(JdbcClient.MappedQuerySpec.class);
        when(spec.query(org.mockito.ArgumentMatchers.<org.springframework.jdbc.core.RowMapper<Object>>any()))
                .thenReturn(queryMock);
        when(queryMock.list()).thenReturn(List.of());

        Map<String, Object> checkoutRes = ctrl.checkout(
                sesionEst, new PagoController.CheckoutSolicitud(77));
        assertEquals(4_000_000L, checkoutRes.get("montoEnCentavos"));
        assertEquals(77, checkoutRes.get("reservaId"));

        // Un tutor no puede pagar una reserva
        ContextoSesion sesionTutor = new ContextoSesion(RolUsuario.TUTOR, 20, "Carlos");
        assertThrows(ResponseStatusException.class,
                () -> ctrl.checkout(sesionTutor, new PagoController.CheckoutSolicitud(77)));

        //Otro estudiante no puede pagar la reserva
        ContextoSesion otroEst = new ContextoSesion(RolUsuario.ESTUDIANTE, 99, "Otro");
        assertThrows(ResponseStatusException.class,
                () -> ctrl.checkout(otroEst, new PagoController.CheckoutSolicitud(77)));

        // Webhook con firma inválida -> 401
        ObjectMapper mapper = new ObjectMapper();
        var evento = mapper.readTree("{\"event\":\"transaction.updated\",\"data\":{\"transaction\":{\"id\":\"tx1\"}}}");
        when(wompi.firmaValida(evento)).thenReturn(false);
        assertThrows(ResponseStatusException.class, () -> ctrl.webhook(evento));

        // Webhook válido sincroniza transacción y confirma reserva
        when(wompi.firmaValida(evento)).thenReturn(true);
        var txNode = mapper.readTree(
                "{\"id\":\"tx1\",\"status\":\"APPROVED\",\"reference\":\"ORD-RES77\","
                + "\"amount_in_cents\":4000000,\"currency\":\"COP\"}");
        when(wompi.consultarTransaccion("tx1")).thenReturn(txNode);
        @SuppressWarnings("unchecked")
        JdbcClient.MappedQuerySpec<Integer> intQuery = mock(JdbcClient.MappedQuerySpec.class);
        when(spec.query(Integer.class)).thenReturn(intQuery);
        when(intQuery.optional()).thenReturn(Optional.of(77));

        ctrl.webhook(evento);
        verify(reservas).cambiarEstado(77, EstadoReserva.CONFIRMADA, null);
    }

    private static String sha256(String texto) throws Exception {
        return HexFormat.of().formatHex(
                MessageDigest.getInstance("SHA-256").digest(texto.getBytes(StandardCharsets.UTF_8)));
    }
}
