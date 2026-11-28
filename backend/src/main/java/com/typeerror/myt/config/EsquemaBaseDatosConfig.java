package com.typeerror.myt.config;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import javax.sql.DataSource;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class EsquemaBaseDatosConfig {

    public static final String BEAN_INITIALIZER = "esquemaBaseDatosInitializer";

    private static final Logger LOG = LoggerFactory.getLogger(EsquemaBaseDatosConfig.class);

    private static final List<String> MIGRACIONES_BASE = List.of(
            "/db/supabase/20260831150000_create_app_schema.sql",
            "/db/supabase/20260903120000_add_domain_constraints_and_indexes.sql",
            "/db/supabase/20260917160000_refactor_domain_model.sql",
            "/db/supabase/20260917170000_add_chat.sql"
    );

    private static final List<String> MIGRACIONES_INCREMENTALES = List.of(
            "/db/supabase/20260917170000_add_chat.sql",
            "/db/supabase/20261029010000_reserva_objetivo.sql",
            "/db/supabase/20261109010000_add_wompi_orders.sql",
            "/db/supabase/20261117120000_add_password_reset_tokens.sql"
    );

    @Bean
    public static BeanFactoryPostProcessor dependenciaEsquemaEntityManagerFactory() {
        return beanFactory -> {
            if (!beanFactory.containsBeanDefinition(BEAN_INITIALIZER)) {
                return;
            }
            for (String beanName : beanFactory.getBeanDefinitionNames()) {
                BeanDefinition definition = beanFactory.getBeanDefinition(beanName);
                String className = definition.getBeanClassName();
                if ("entityManagerFactory".equals(beanName)
                        || (className != null && className.contains("EntityManagerFactory"))) {
                    agregarDependencia(definition, BEAN_INITIALIZER);
                }
            }
        };
    }

    private static void agregarDependencia(BeanDefinition definition, String dependencyName) {
        String[] existentes = definition.getDependsOn();
        if (existentes == null || existentes.length == 0) {
            definition.setDependsOn(dependencyName);
            return;
        }
        List<String> lista = new ArrayList<>(Arrays.asList(existentes));
        if (!lista.contains(dependencyName)) {
            lista.add(dependencyName);
            definition.setDependsOn(lista.toArray(String[]::new));
        }
    }

    @Bean(BEAN_INITIALIZER)
    public Boolean esquemaBaseDatosInitializer(
            ObjectProvider<DataSource> dataSourceProvider,
            @Value("${DB_SCHEMA:app}") String esquema,
            @Value("${spring.jpa.hibernate.ddl-auto:validate}") String ddlAuto) {
        DataSource dataSource = dataSourceProvider.getIfAvailable();
        if (dataSource != null) {
            sincronizarEsquema(dataSource, esquema, ddlAuto);
        }
        return Boolean.TRUE;
    }

    public void sincronizarEsquema(DataSource dataSource, String esquema, String ddlAuto) {
        if ("create".equalsIgnoreCase(ddlAuto) || "create-drop".equalsIgnoreCase(ddlAuto)) {
            return;
        }
        String nombreEsquema = (esquema == null || esquema.isBlank()) ? "app" : esquema.trim();
        if (!"app".equalsIgnoreCase(nombreEsquema)) {
            return;
        }
        String esquemaSql = "\"app\"";
        try (Connection conexion = dataSource.getConnection()) {
            if (!tablaExiste(conexion, esquemaSql, "usuarios")) {
                ejecutarRecursosSql(conexion, MIGRACIONES_BASE);
            }
            if (tablaExiste(conexion, esquemaSql, "usuarios")) {
                ejecutarRecursosSql(conexion, MIGRACIONES_INCREMENTALES);
            }
            asegurarPermisosEsquema(conexion);
        } catch (SQLException | IOException ex) {
            LOG.warn("No se pudo verificar o sincronizar el esquema {}: {}",
                    nombreEsquema, ex.getMessage());
        }
    }

    boolean tablaExiste(Connection conexion, String esquemaSql, String tabla) throws SQLException {
        try (PreparedStatement ps = conexion.prepareStatement("select to_regclass(?)")) {
            ps.setString(1, esquemaSql + "." + tabla);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() && rs.getString(1) != null;
            }
        }
    }

    private void ejecutarRecursosSql(Connection conexion, List<String> recursos)
            throws SQLException, IOException {
        for (String recurso : recursos) {
            try (InputStream entrada = EsquemaBaseDatosConfig.class.getResourceAsStream(recurso)) {
                if (entrada == null) {
                    return;
                }
                String sql = new String(entrada.readAllBytes(), StandardCharsets.UTF_8);
                try (Statement sentencia = conexion.createStatement()) {
                    sentencia.execute(sql);
                }
            }
        }
    }

    private void asegurarPermisosEsquema(Connection conexion) {
        try (Statement sentencia = conexion.createStatement()) {
            sentencia.execute("grant usage on schema app to current_user");
            sentencia.execute("grant all privileges on all tables in schema app to current_user");
            sentencia.execute("grant all privileges on all sequences in schema app to current_user");
        } catch (SQLException ignored) {
            // Si el usuario actual no tiene privilegios de GRANT, conserva sus permisos existentes.
        }
    }
}
