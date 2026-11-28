package com.typeerror.myt.api;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SaludRestController {

    private static final Logger LOG = LoggerFactory.getLogger(SaludRestController.class);
    private static final long DEFAULT_CACHE_MILLIS = Duration.ofSeconds(60).toMillis();
    private static final String CLAVE_ESTADO = "estado";
    private static final String VALOR_OK = "ok";

    private final JdbcClient db;
    private final String materias;
    private final long cacheMillis;
    private final AtomicLong ultimaVerificacionDbMs = new AtomicLong(0L);

    public SaludRestController(JdbcClient db, String esquema) {
        this(db, esquema, DEFAULT_CACHE_MILLIS);
    }

    @Autowired
    public SaludRestController(
            JdbcClient db,
            @Value("${DB_SCHEMA:app}") String esquema,
            @Value("${myt.salud.cache-ms:60000}") long cacheMillis) {
        this.db = db;
        this.materias = "\"" + esquema.replace("\"", "\"\"") + "\".materias";
        this.cacheMillis = Math.max(0L, cacheMillis);
    }

    public Map<String, String> salud() {
        return salud(false);
    }

    @RequestMapping(
            value = "/api/salud",
            method = {RequestMethod.GET, RequestMethod.HEAD})
    public Map<String, String> salud(
            @RequestParam(name = "forzarDb", defaultValue = "false") boolean forzarDb) {
        long ahora = System.currentTimeMillis();
        long ultima = ultimaVerificacionDbMs.get();
        boolean cacheVigente = !forzarDb
                && ultima > 0L
                && (ahora - ultima) < cacheMillis;

        if (!cacheVigente) {
            try {
                db.sql("select 1 from " + materias + " limit 1")
                        .query(Integer.class)
                        .optional();
                ultimaVerificacionDbMs.set(ahora);
            } catch (RuntimeException ex) {
                if (ultima == 0L || forzarDb) {
                    throw ex;
                }
                LOG.warn("Verificación de salud en BD falló de forma transitoria; "
                        + "se mantiene instancia activa en Render: {}", ex.getMessage());
                return Map.of(CLAVE_ESTADO, VALOR_OK, "db", "degradado");
            }
        }
        return Map.of(CLAVE_ESTADO, VALOR_OK);
    }
}
