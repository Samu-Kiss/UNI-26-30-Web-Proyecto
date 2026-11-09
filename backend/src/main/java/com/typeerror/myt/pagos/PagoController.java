package com.typeerror.myt.pagos;

import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import com.typeerror.myt.service.ContextoSesion;
import tools.jackson.databind.JsonNode;

@RestController
@RequestMapping("/api/pagos")
public class PagoController {
    private static final long CENTAVOS = 1_500_000L;
    private final WompiService wompi;
    private final JdbcClient db;
    private final String ordenes;

    public PagoController(WompiService wompi, JdbcClient db, @Value("${DB_SCHEMA:app}") String esquema) {
        this.wompi = wompi;
        this.db = db;
        ordenes = "\"" + esquema.replace("\"", "\"\"") + "\".ordenes";
    }

    @GetMapping("/configuracion")
    public Map<String, Boolean> configuracion() {
        return Map.of("habilitado", wompi.habilitado());
    }

    @PostMapping("/checkout")
    public Map<String, String> checkout(@RequestAttribute("apiSesion") ContextoSesion sesion) {
        if (!wompi.habilitado()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Wompi Sandbox sin configurar");
        }
        String referencia = "ORD-" + UUID.randomUUID();
        String url = wompi.checkout(referencia, CENTAVOS);
        db.sql("insert into " + ordenes + " (referencia, perfil, monto_en_centavos) values (?, ?, ?)")
                .params(referencia, sesion.valor(), CENTAVOS).update();
        return Map.of("url", url, "referencia", referencia);
    }

    @GetMapping("/orden/{referencia}")
    public Map<String, String> estado(@RequestAttribute("apiSesion") ContextoSesion sesion,
            @PathVariable String referencia) {
        String estado = db.sql("select estado from " + ordenes + " where referencia = ? and perfil = ?")
                .params(referencia, sesion.valor()).query(String.class).optional()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Orden inexistente"));
        return Map.of("estado", estado);
    }

    @PostMapping("/webhook")
    public void webhook(@RequestBody JsonNode evento) {
        if (!"transaction.updated".equals(evento.path("event").asText())) {
            return;
        }
        if (!wompi.firmaValida(evento)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Firma de Wompi inválida");
        }
        String id = evento.path("data").path("transaction").path("id").asText();
        JsonNode tx = wompi.consultarTransaccion(id);
        String estado = tx.path("status").asText();
        if (!"COP".equals(tx.path("currency").asText())
                || !Set.of("APPROVED", "DECLINED", "ERROR", "VOIDED").contains(estado)) {
            return;
        }
        db.sql("update " + ordenes + """
                 set estado = ?, wompi_transaccion_id = ?
                 where referencia = ? and monto_en_centavos = ?
                   and (estado = 'PENDING'
                        or (estado = 'APPROVED' and ? = 'VOIDED' and wompi_transaccion_id = ?))
                """)
                .params(estado, id, tx.path("reference").asText(),
                        tx.path("amount_in_cents").asLong(-1), estado, id).update();
    }
}
