package com.typeerror.myt;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Properties;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class MyTApplication {

    public static void main(String[] args) {
        normalizarPropiedadesRender(System.getenv(), System.getProperties());
        SpringApplication.run(MyTApplication.class, args);
    }

    static void normalizarPropiedadesRender(
            Map<String, String> entorno,
            Properties propiedadesSistema) {
        if (entorno == null || propiedadesSistema == null) {
            return;
        }
        String rawUrl = null;
        boolean desdeDatabaseUrl = false;
        for (String claveUrl : new String[] {
            "SPRING_DATASOURCE_URL",
            "SUPABASE_DEV_DB_URL",
            "SUPABASE_PROD_DB_URL",
            "SUPABASE_DB_URL",
            "DATABASE_URL"
        }) {
            String candidata = entorno.get(claveUrl);
            if (!estaVacio(candidata)) {
                rawUrl = candidata;
                desdeDatabaseUrl = "DATABASE_URL".equals(claveUrl);
                break;
            }
        }
        if (estaVacio(rawUrl)) {
            return;
        }
        String limpia = rawUrl.trim();
        String sinJdbc = limpia.startsWith("jdbc:") ? limpia.substring("jdbc:".length()) : limpia;
        if (sinJdbc.startsWith("postgres://")) {
            sinJdbc = "postgresql://" + sinJdbc.substring("postgres://".length());
        }
        if (!sinJdbc.startsWith("postgresql://")) {
            return;
        }
        try {
            URI uri = URI.create(sinJdbc);
            String host = uri.getHost();
            String path = uri.getRawPath();
            String userInfo = uri.getRawUserInfo();
            boolean requiereNormalizacion = desdeDatabaseUrl
                    || !limpia.startsWith("jdbc:postgresql://")
                    || (userInfo != null && !userInfo.isBlank());
            if (!requiereNormalizacion || host == null || path == null || path.length() <= 1) {
                return;
            }
            int port = uri.getPort() > 0 ? uri.getPort() : 5432;
            String query = uri.getRawQuery();
            String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + path
                    + (query != null && !query.isBlank() ? "?" + query : "");
            propiedadesSistema.setProperty("spring.datasource.url", jdbcUrl);
            if (!estaVacio(entorno.get("SUPABASE_DEV_DB_URL"))) {
                propiedadesSistema.setProperty("SUPABASE_DEV_DB_URL", jdbcUrl);
            }
            if (!estaVacio(entorno.get("SUPABASE_PROD_DB_URL"))) {
                propiedadesSistema.setProperty("SUPABASE_PROD_DB_URL", jdbcUrl);
            }
            if (!estaVacio(entorno.get("SUPABASE_DB_URL"))) {
                propiedadesSistema.setProperty("SUPABASE_DB_URL", jdbcUrl);
            }

            if (userInfo != null && !userInfo.isBlank()) {
                String[] partes = userInfo.split(":", 2);
                String usuario = URLDecoder.decode(partes[0], StandardCharsets.UTF_8);
                if (!usuario.isBlank() && estaVacio(entorno.get("SPRING_DATASOURCE_USERNAME"))
                        && !propiedadesSistema.containsKey("spring.datasource.username")) {
                    propiedadesSistema.setProperty("spring.datasource.username", usuario);
                    if (!estaVacio(entorno.get("SUPABASE_DEV_DB_USERNAME"))) {
                        propiedadesSistema.setProperty("SUPABASE_DEV_DB_USERNAME", usuario);
                    }
                    if (!estaVacio(entorno.get("SUPABASE_PROD_DB_USERNAME"))) {
                        propiedadesSistema.setProperty("SUPABASE_PROD_DB_USERNAME", usuario);
                    }
                }
                if (partes.length == 2) {
                    String clave = URLDecoder.decode(partes[1], StandardCharsets.UTF_8);
                    if (estaVacio(entorno.get("SPRING_DATASOURCE_PASSWORD"))
                            && !propiedadesSistema.containsKey("spring.datasource.password")) {
                        propiedadesSistema.setProperty("spring.datasource.password", clave);
                        if (!estaVacio(entorno.get("SUPABASE_DEV_DB_PASSWORD"))) {
                            propiedadesSistema.setProperty("SUPABASE_DEV_DB_PASSWORD", clave);
                        }
                        if (!estaVacio(entorno.get("SUPABASE_PROD_DB_PASSWORD"))) {
                            propiedadesSistema.setProperty("SUPABASE_PROD_DB_PASSWORD", clave);
                        }
                    }
                }
            }
        } catch (IllegalArgumentException ignored) {
            // Si la URL no es parseable como URI estándar, se delega al driver JDBC.
        }
    }

    private static boolean estaVacio(String valor) {
        return valor == null || valor.isBlank();
    }
}
