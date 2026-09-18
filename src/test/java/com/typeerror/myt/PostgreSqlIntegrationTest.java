package com.typeerror.myt;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.DriverManager;
import java.sql.SQLException;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.postgresql.PostgreSQLContainer;

public abstract class PostgreSqlIntegrationTest {

    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17-alpine")
            .withDatabaseName("myt_test")
            .withUsername("myt")
            .withPassword("myt")
            .withInitScript("db/supabase/20260831150000_create_app_schema.sql");

    static {
        POSTGRES.start();
        aplicarMigracion("/db/supabase/20260917160000_refactor_domain_model.sql");
        aplicarMigracion("/db/supabase/20260917170000_add_chat.sql");
    }

    private static void aplicarMigracion(String recurso) {
        try (var entrada = PostgreSqlIntegrationTest.class.getResourceAsStream(recurso);
                var conexion = DriverManager.getConnection(
                        POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
                var sentencia = conexion.createStatement()) {
            if (entrada == null) {
                throw new IllegalStateException("No se encontro la migracion de prueba " + recurso);
            }
            sentencia.execute(new String(entrada.readAllBytes(), StandardCharsets.UTF_8));
        } catch (IOException | SQLException exception) {
            throw new IllegalStateException("No fue posible preparar el esquema de prueba", exception);
        }
    }

    @DynamicPropertySource
    static void postgresProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.datasource.driver-class-name", POSTGRES::getDriverClassName);
    }
}
