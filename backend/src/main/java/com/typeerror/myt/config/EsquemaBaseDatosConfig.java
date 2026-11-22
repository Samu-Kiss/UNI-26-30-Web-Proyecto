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
        String esquemaSql = "\"" + nombreEsquema.replace("\"", "\"\"") + "\"";
        try (Connection conexion = dataSource.getConnection()) {
            if (!tablaExiste(conexion, esquemaSql, "usuarios")
                    && "app".equalsIgnoreCase(nombreEsquema)) {
                aplicarMigracionesBase(conexion);
            }
            if (tablaExiste(conexion, esquemaSql, "usuarios")) {
                aplicarMigracionesIncrementales(conexion, esquemaSql);
            }
            asegurarPermisosEsquema(conexion, esquemaSql);
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

    private void aplicarMigracionesBase(Connection conexion) throws SQLException, IOException {
        for (String recurso : MIGRACIONES_BASE) {
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

    private void aplicarMigracionesIncrementales(Connection conexion, String esquemaSql)
            throws SQLException {
        try (Statement sentencia = conexion.createStatement()) {
            sentencia.execute("alter table " + esquemaSql
                    + ".reservas add column if not exists objetivo varchar(300)");

            sentencia.execute("""
                    create table if not exists %s.conversaciones (
                        id integer generated by default as identity primary key,
                        reserva_id integer not null unique,
                        estado varchar(20) not null default 'ACTIVA'
                            constraint ck_conversaciones_estado check (estado in ('ACTIVA', 'CERRADA')),
                        fecha_creacion timestamp not null default current_timestamp,
                        version bigint not null default 0,
                        constraint fk_conversacion_reserva foreign key (reserva_id)
                            references %s.reservas (id)
                    )
                    """.formatted(esquemaSql, esquemaSql));

            sentencia.execute("""
                    create table if not exists %s.mensajes (
                        id bigint generated by default as identity primary key,
                        conversacion_id integer not null,
                        remitente_usuario_id integer not null,
                        contenido varchar(4000) not null,
                        fecha_envio timestamp not null default current_timestamp,
                        fecha_edicion timestamp,
                        fecha_eliminacion timestamp,
                        leido_en timestamp,
                        version bigint not null default 0,
                        constraint ck_mensajes_contenido
                            check (length(trim(contenido)) between 1 and 4000),
                        constraint fk_mensaje_conversacion foreign key (conversacion_id)
                            references %s.conversaciones (id),
                        constraint fk_mensaje_remitente foreign key (remitente_usuario_id)
                            references %s.usuarios (id)
                    )
                    """.formatted(esquemaSql, esquemaSql, esquemaSql));

            sentencia.execute("create index if not exists ix_mensajes_conversacion_fecha on "
                    + esquemaSql + ".mensajes (conversacion_id, fecha_envio, id)");
            sentencia.execute("create index if not exists ix_mensajes_remitente on "
                    + esquemaSql + ".mensajes (remitente_usuario_id)");

            sentencia.execute("""
                    create table if not exists %s.ordenes (
                        referencia varchar(64) primary key,
                        perfil varchar(64) not null,
                        reserva_id integer references %s.reservas(id) on delete set null,
                        concepto varchar(300) not null default 'Tutoría académica MyT',
                        monto_en_centavos bigint not null check (monto_en_centavos > 0),
                        estado varchar(10) not null default 'PENDING'
                            check (estado in ('PENDING', 'APPROVED', 'DECLINED', 'ERROR', 'VOIDED')),
                        wompi_transaccion_id varchar(64) unique,
                        fecha_creacion timestamptz not null default now()
                    )
                    """.formatted(esquemaSql, esquemaSql));

            sentencia.execute("alter table " + esquemaSql
                    + ".ordenes add column if not exists reserva_id integer references "
                    + esquemaSql + ".reservas(id) on delete set null");
            sentencia.execute("alter table " + esquemaSql
                    + ".ordenes add column if not exists concepto varchar(300) not null"
                    + " default 'Tutoría académica MyT'");
            sentencia.execute("create index if not exists idx_ordenes_reserva_id on "
                    + esquemaSql + ".ordenes(reserva_id)");
            sentencia.execute("create index if not exists idx_ordenes_perfil on "
                    + esquemaSql + ".ordenes(perfil)");

            sentencia.execute("""
                    create table if not exists %s.tokens_recuperacion (
                        id integer generated by default as identity primary key,
                        usuario_id integer not null,
                        token varchar(64) not null unique,
                        fecha_expiracion timestamp not null,
                        usado boolean not null default false,
                        fecha_creacion timestamp not null default current_timestamp,
                        constraint fk_token_recuperacion_usuario foreign key (usuario_id)
                            references %s.usuarios (id) on delete cascade
                    )
                    """.formatted(esquemaSql, esquemaSql));

            sentencia.execute("create index if not exists ix_tokens_recuperacion_token on "
                    + esquemaSql + ".tokens_recuperacion (token)");
            sentencia.execute("create index if not exists ix_tokens_recuperacion_usuario on "
                    + esquemaSql + ".tokens_recuperacion (usuario_id)");
            sentencia.execute("alter table " + esquemaSql
                    + ".tokens_recuperacion enable row level security");
        }
    }

    private void asegurarPermisosEsquema(Connection conexion, String esquemaSql) {
        try (Statement sentencia = conexion.createStatement()) {
            sentencia.execute("grant usage on schema " + esquemaSql + " to current_user");
            sentencia.execute("grant all privileges on all tables in schema "
                    + esquemaSql + " to current_user");
            sentencia.execute("grant all privileges on all sequences in schema "
                    + esquemaSql + " to current_user");
        } catch (SQLException ignored) {
            // Si el usuario actual no tiene privilegios de GRANT, conserva sus permisos existentes.
        }
    }
}
