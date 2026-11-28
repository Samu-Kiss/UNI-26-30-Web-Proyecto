package com.typeerror.myt;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Properties;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class MyTApplication {

    private static final String ENV_SPRING_URL = "SPRING_DATASOURCE_URL";
    private static final String ENV_SUPABASE_DEV_URL = "SUPABASE_DEV_DB_URL";
    private static final String ENV_SUPABASE_PROD_URL = "SUPABASE_PROD_DB_URL";
    private static final String ENV_SUPABASE_URL = "SUPABASE_DB_URL";
    private static final String ENV_DATABASE_URL = "DATABASE_URL";

    private static final List<String> CLAVES_URL = List.of(
            ENV_SUPABASE_DEV_URL,
            ENV_SUPABASE_PROD_URL,
            ENV_SUPABASE_URL,
            ENV_SPRING_URL,
            ENV_DATABASE_URL
    );

    private static final List<String> CLAVES_SUPABASE_URL = List.of(
            ENV_SUPABASE_DEV_URL,
            ENV_SUPABASE_PROD_URL,
            ENV_SUPABASE_URL
    );

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
        String claveActiva = buscarClaveUrlActiva(entorno);
        if (claveActiva == null) {
            return;
        }
        String limpia = entorno.get(claveActiva).trim();
        String uriPostgres = convertirAUriPostgres(limpia);
        if (uriPostgres == null) {
            return;
        }
        try {
            aplicarUriNormalizada(
                    URI.create(uriPostgres),
                    limpia,
                    ENV_DATABASE_URL.equals(claveActiva) || CLAVES_SUPABASE_URL.contains(claveActiva),
                    entorno,
                    propiedadesSistema);
        } catch (IllegalArgumentException ignored) {
            // Si la URL no es parseable como URI estándar, se delega al driver JDBC.
        }
        aplicarCredencialesSupabaseExplicitas(entorno, propiedadesSistema);
    }

    private static String buscarClaveUrlActiva(Map<String, String> entorno) {
        for (String clave : CLAVES_URL) {
            if (!estaVacio(entorno.get(clave))) {
                return clave;
            }
        }
        return null;
    }

    private static String convertirAUriPostgres(String url) {
        String sinJdbc = url.startsWith("jdbc:") ? url.substring("jdbc:".length()) : url;
        if (sinJdbc.startsWith("postgres://")) {
            return "postgresql://" + sinJdbc.substring("postgres://".length());
        }
        return sinJdbc.startsWith("postgresql://") ? sinJdbc : null;
    }

    private static void aplicarUriNormalizada(
            URI uri,
            String urlOriginal,
            boolean desdeDatabaseUrl,
            Map<String, String> entorno,
            Properties propiedadesSistema) {
        String host = uri.getHost();
        String path = uri.getRawPath();
        String userInfo = uri.getRawUserInfo();
        boolean requiereNormalizacion = desdeDatabaseUrl
                || !urlOriginal.startsWith("jdbc:postgresql://")
                || !estaVacio(userInfo);
        if (!requiereNormalizacion || host == null || path == null || path.length() <= 1) {
            return;
        }
        int port = uri.getPort() > 0 ? uri.getPort() : 5432;
        String query = uri.getRawQuery();
        String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + path
                + (estaVacio(query) ? "" : "?" + query);

        propiedadesSistema.setProperty("spring.datasource.url", jdbcUrl);
        propagarSiPresente(entorno, propiedadesSistema, CLAVES_SUPABASE_URL, jdbcUrl);
        aplicarCredencialesEmbebidas(userInfo, entorno, propiedadesSistema);
    }

    private static void aplicarCredencialesEmbebidas(
            String userInfo,
            Map<String, String> entorno,
            Properties propiedadesSistema) {
        if (estaVacio(userInfo)) {
            return;
        }
        String[] partes = userInfo.split(":", 2);
        String usuario = URLDecoder.decode(partes[0], StandardCharsets.UTF_8);
        if (!estaVacio(usuario)
                && estaVacio(entorno.get("SPRING_DATASOURCE_USERNAME"))
                && !propiedadesSistema.containsKey("spring.datasource.username")) {
            propiedadesSistema.setProperty("spring.datasource.username", usuario);
            propagarSiPresente(
                    entorno,
                    propiedadesSistema,
                    List.of("SUPABASE_DEV_DB_USERNAME", "SUPABASE_PROD_DB_USERNAME"),
                    usuario);
        }
        if (partes.length == 2
                && estaVacio(entorno.get("SPRING_DATASOURCE_PASSWORD"))
                && !propiedadesSistema.containsKey("spring.datasource.password")) {
            String clave = URLDecoder.decode(partes[1], StandardCharsets.UTF_8);
            propiedadesSistema.setProperty("spring.datasource.password", clave);
            propagarSiPresente(
                    entorno,
                    propiedadesSistema,
                    List.of("SUPABASE_DEV_DB_PASSWORD", "SUPABASE_PROD_DB_PASSWORD"),
                    clave);
        }
    }

    private static void aplicarCredencialesSupabaseExplicitas(
            Map<String, String> entorno,
            Properties propiedadesSistema) {
        String usuarioSupabase = primeroNoVacio(
                entorno,
                List.of("SUPABASE_DEV_DB_USERNAME", "SUPABASE_PROD_DB_USERNAME"));
        if (!estaVacio(usuarioSupabase)) {
            propiedadesSistema.setProperty("spring.datasource.username", usuarioSupabase.trim());
        }
        String claveSupabase = primeroNoVacio(
                entorno,
                List.of("SUPABASE_DEV_DB_PASSWORD", "SUPABASE_PROD_DB_PASSWORD"));
        if (!estaVacio(claveSupabase)) {
            propiedadesSistema.setProperty("spring.datasource.password", claveSupabase.trim());
        }
    }

    private static String primeroNoVacio(Map<String, String> entorno, List<String> claves) {
        for (String clave : claves) {
            String valor = entorno.get(clave);
            if (!estaVacio(valor)) {
                return valor;
            }
        }
        return null;
    }

    private static void propagarSiPresente(
            Map<String, String> entorno,
            Properties propiedadesSistema,
            List<String> claves,
            String valor) {
        for (String clave : claves) {
            if (!estaVacio(entorno.get(clave))) {
                propiedadesSistema.setProperty(clave, valor);
            }
        }
    }

    private static boolean estaVacio(String valor) {
        return valor == null || valor.isBlank();
    }
}
