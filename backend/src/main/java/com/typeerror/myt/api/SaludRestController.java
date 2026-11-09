package com.typeerror.myt.api;

import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SaludRestController {
    private final JdbcClient db;
    private final String materias;

    public SaludRestController(JdbcClient db, @Value("${DB_SCHEMA:app}") String esquema) {
        this.db = db;
        materias = "\"" + esquema.replace("\"", "\"\"") + "\".materias";
    }

    @GetMapping("/api/salud")
    public Map<String, String> salud() {
        db.sql("select 1 from " + materias + " limit 1").query(Integer.class).optional();
        return Map.of("estado", "ok");
    }
}
