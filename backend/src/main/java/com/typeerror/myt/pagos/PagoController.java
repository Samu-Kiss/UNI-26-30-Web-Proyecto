package com.typeerror.myt.pagos;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.typeerror.myt.entities.EstadoReserva;
import com.typeerror.myt.entities.Reserva;
import com.typeerror.myt.entities.RolUsuario;
import com.typeerror.myt.service.ContextoSesion;
import com.typeerror.myt.service.ReservaService;

import tools.jackson.databind.JsonNode;

@RestController
@RequestMapping("/api/pagos")
public class PagoController {

    private static final long CENTAVOS_ABONO = 1_500_000L;
    private static final String CONCEPTO_ABONO = "Abono de tutoría académica MyT";

    private final WompiService wompi;
    private final JdbcClient db;
    private final ReservaService reservas;
    private final String esquemaSql;
    private final String ordenes;

    public record CheckoutSolicitud(Integer reservaId) { }

    public record ResumenPagoReserva(String estadoPago, String referenciaPago) { }

    public record OrdenPagoDto(
            String referencia,
            Integer reservaId,
            String concepto,
            long montoEnCentavos,
            BigDecimal montoCop,
            String estado,
            String wompiTransaccionId,
            String fechaCreacion,
            String materia,
            String tutor,
            String estudiante,
            String estadoReserva) { }

    public PagoController(
            WompiService wompi,
            JdbcClient db,
            ReservaService reservas,
            @Value("${DB_SCHEMA:app}") String esquema) {
        this.wompi = wompi;
        this.db = db;
        this.reservas = reservas;
        this.esquemaSql = "\"" + esquema.replace("\"", "\"\"") + "\"";
        this.ordenes = esquemaSql + ".ordenes";
        asegurarColumnasIntegracion();
    }

    private void asegurarColumnasIntegracion() {
        try {
            db.sql("alter table " + ordenes
                    + " add column if not exists reserva_id integer references "
                    + esquemaSql + ".reservas(id) on delete set null").update();
            db.sql("alter table " + ordenes
                    + " add column if not exists concepto varchar(300) not null default '"
                    + CONCEPTO_ABONO + "'").update();
        } catch (DataAccessException ignored) {
            // La tabla se crea en las migraciones; si aún no existe en un test aislado, se ignora.
        }
    }

    @GetMapping("/configuracion")
    public Map<String, Object> configuracion() {
        return Map.of("habilitado", wompi.habilitado(), "moneda", "COP");
    }

    @GetMapping("/ordenes")
    public List<OrdenPagoDto> listarOrdenes(@RequestAttribute("apiSesion") ContextoSesion sesion) {
        String baseSql = """
                select o.referencia, o.reserva_id, o.concepto, o.monto_en_centavos,
                       o.estado, o.wompi_transaccion_id, o.fecha_creacion,
                       m.nombre as materia,
                       concat(ut.nombre, ' ', ut.apellido) as tutor,
                       concat(ue.nombre, ' ', ue.apellido) as estudiante,
                       r.estado as estado_reserva
                from %s.ordenes o
                left join %s.reservas r on r.id = o.reserva_id
                left join %s.materias m on m.id = r.materia_id
                left join %s.tutores t on t.id = r.tutor_id
                left join %s.usuarios ut on ut.id = t.usuario_id
                left join %s.estudiantes e on e.id = r.estudiante_id
                left join %s.usuarios ue on ue.id = e.usuario_id
                """.formatted(
                esquemaSql, esquemaSql, esquemaSql, esquemaSql, esquemaSql, esquemaSql, esquemaSql);

        JdbcClient.StatementSpec spec = switch (sesion.rol()) {
            case ADMINISTRADOR -> db.sql(baseSql + " order by o.fecha_creacion desc");
            case TUTOR -> db.sql(baseSql
                    + " where o.perfil = ? or r.tutor_id = ? order by o.fecha_creacion desc")
                    .params(sesion.valor(), sesion.perfilId());
            case ESTUDIANTE -> db.sql(baseSql
                    + " where o.perfil = ? or r.estudiante_id = ? order by o.fecha_creacion desc")
                    .params(sesion.valor(), sesion.perfilId());
        };

        return spec.query((rs, rowNum) -> {
            long centavos = rs.getLong("monto_en_centavos");
            BigDecimal cop = BigDecimal.valueOf(centavos)
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            Timestamp ts = rs.getTimestamp("fecha_creacion");
            Integer resId = rs.getObject("reserva_id", Integer.class);
            return new OrdenPagoDto(
                    rs.getString("referencia"),
                    resId,
                    rs.getString("concepto"),
                    centavos,
                    cop,
                    rs.getString("estado"),
                    rs.getString("wompi_transaccion_id"),
                    ts != null ? ts.toInstant().toString() : null,
                    rs.getString("materia"),
                    rs.getString("tutor"),
                    rs.getString("estudiante"),
                    rs.getString("estado_reserva"));
        }).list();
    }

    @PostMapping("/checkout")
    @Transactional
    public Map<String, Object> checkout(
            @RequestAttribute("apiSesion") ContextoSesion sesion,
            @RequestBody(required = false) CheckoutSolicitud solicitud) {
        if (!wompi.habilitado()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE, "Wompi Sandbox sin configurar");
        }

        Integer reservaId = solicitud != null ? solicitud.reservaId() : null;
        long centavos = CENTAVOS_ABONO;
        String concepto = CONCEPTO_ABONO;
        String referencia = "ORD-" + UUID.randomUUID();

        if (reservaId != null) {
            Reserva reserva = reservas.findById(reservaId).orElseThrow(
                    () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reserva no encontrada"));
            if (sesion.rol() == RolUsuario.ESTUDIANTE
                    && !reserva.getEstudiante().getId().equals(sesion.perfilId())) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN, "La reserva pertenece a otro estudiante");
            }
            if (sesion.rol() == RolUsuario.TUTOR) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN, "Solo el estudiante puede pagar la reserva");
            }
            if (reserva.getEstado() == EstadoReserva.CANCELADA
                    || reserva.getEstado() == EstadoReserva.RECHAZADA) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "No se puede pagar una reserva cancelada o rechazada");
            }
            ResumenPagoReserva resumen = pagoDeReserva(reservaId);
            if ("APPROVED".equals(resumen.estadoPago())) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT, "Esta tutoría ya tiene un pago aprobado");
            }
            centavos = reserva.getCostoTotal()
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(0, RoundingMode.HALF_UP)
                    .longValueExact();
            String descripcion = "Tutoría de " + reserva.getMateria().getNombre()
                    + " con " + reserva.getTutor().getUsuario().getNombre()
                    + " · " + reserva.getTema();
            concepto = descripcion.length() > 300 ? descripcion.substring(0, 300) : descripcion;
            String sufijo = UUID.randomUUID().toString().replace("-", "")
                    .substring(0, 10).toUpperCase(Locale.ROOT);
            referencia = "ORD-RES" + reserva.getId() + "-" + sufijo;
        }

        String url = wompi.checkout(referencia, centavos);
        db.sql("insert into " + ordenes
                + " (referencia, perfil, reserva_id, concepto, monto_en_centavos)"
                + " values (?, ?, ?, ?, ?)")
                .params(referencia, sesion.valor(), reservaId, concepto, centavos)
                .update();

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("url", url);
        respuesta.put("referencia", referencia);
        respuesta.put("montoEnCentavos", centavos);
        respuesta.put("concepto", concepto);
        if (reservaId != null) {
            respuesta.put("reservaId", reservaId);
        }
        return respuesta;
    }

    @GetMapping("/orden/{referencia}")
    @Transactional
    public Map<String, Object> estado(
            @RequestAttribute("apiSesion") ContextoSesion sesion,
            @PathVariable String referencia,
            @RequestParam(required = false) String transaccionId) {
        var fila = consultarFilaOrden(sesion, referencia);
        String estadoActual = (String) fila.get("estado");
        if ("PENDING".equals(estadoActual)
                && transaccionId != null
                && !transaccionId.isBlank()
                && wompi.habilitado()) {
            sincronizarTransaccion(transaccionId.trim());
            fila = consultarFilaOrden(sesion, referencia);
        }
        return fila;
    }

    @PostMapping("/webhook")
    @Transactional
    public void webhook(@RequestBody JsonNode evento) {
        if (!"transaction.updated".equals(evento.path("event").asText())) {
            return;
        }
        if (!wompi.firmaValida(evento)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Firma de Wompi inválida");
        }
        String id = evento.path("data").path("transaction").path("id").asText();
        sincronizarTransaccion(id);
    }

    private void sincronizarTransaccion(String id) {
        JsonNode tx = wompi.consultarTransaccion(id);
        String estado = tx.path("status").asText();
        String referencia = tx.path("reference").asText();
        long centavos = tx.path("amount_in_cents").asLong(-1);
        if (!"COP".equals(tx.path("currency").asText())
                || !Set.of("APPROVED", "DECLINED", "ERROR", "VOIDED").contains(estado)) {
            return;
        }
        int actualizadas = db.sql("update " + ordenes + """
                 set estado = ?, wompi_transaccion_id = ?
                 where referencia = ? and monto_en_centavos = ?
                   and (estado = 'PENDING'
                        or (estado = 'APPROVED' and ? = 'VOIDED' and wompi_transaccion_id = ?))
                """)
                .params(estado, id, referencia, centavos, estado, id)
                .update();

        if (actualizadas > 0 && "APPROVED".equals(estado)) {
            confirmarReservaSiCorresponde(referencia);
        }
    }

    private void confirmarReservaSiCorresponde(String referencia) {
        Integer reservaId = db.sql("select reserva_id from " + ordenes + " where referencia = ?")
                .params(referencia)
                .query(Integer.class)
                .optional()
                .orElse(null);
        if (reservaId == null) {
            return;
        }
        reservas.findById(reservaId).ifPresent(reserva -> {
            if (reserva.getEstado() == EstadoReserva.PENDIENTE) {
                reservas.cambiarEstado(reservaId, EstadoReserva.CONFIRMADA, null);
            }
        });
    }

    private Map<String, Object> consultarFilaOrden(ContextoSesion sesion, String referencia) {
        String sql = """
                select o.referencia, o.estado, o.monto_en_centavos, o.concepto,
                       o.reserva_id, o.wompi_transaccion_id
                from %s.ordenes o
                left join %s.reservas r on r.id = o.reserva_id
                where o.referencia = ?
                  and (o.perfil = ?
                       or ? = 'ADMINISTRADOR'
                       or (? = 'ESTUDIANTE' and r.estudiante_id = ?)
                       or (? = 'TUTOR' and r.tutor_id = ?))
                """.formatted(esquemaSql, esquemaSql);

        return db.sql(sql)
                .params(
                        referencia,
                        sesion.valor(),
                        sesion.rol().name(),
                        sesion.rol().name(),
                        sesion.perfilId(),
                        sesion.rol().name(),
                        sesion.perfilId())
                .query((rs, rowNum) -> {
                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("referencia", rs.getString("referencia"));
                    map.put("estado", rs.getString("estado"));
                    map.put("montoEnCentavos", rs.getLong("monto_en_centavos"));
                    map.put("concepto", rs.getString("concepto"));
                    Integer resId = rs.getObject("reserva_id", Integer.class);
                    if (resId != null) {
                        map.put("reservaId", resId);
                    }
                    String txId = rs.getString("wompi_transaccion_id");
                    if (txId != null) {
                        map.put("wompiTransaccionId", txId);
                    }
                    return map;
                })
                .optional()
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Orden inexistente"));
    }

    public ResumenPagoReserva pagoDeReserva(Integer reservaId) {
        if (reservaId == null) {
            return new ResumenPagoReserva("SIN_PAGO", null);
        }
        return pagosPorReservas(List.of(reservaId))
                .getOrDefault(reservaId, new ResumenPagoReserva("SIN_PAGO", null));
    }

    public Map<Integer, ResumenPagoReserva> pagosPorReservas(Collection<Integer> reservaIds) {
        if (reservaIds == null || reservaIds.isEmpty()) {
            return Map.of();
        }
        try {
            String sql = """
                    select distinct on (reserva_id) reserva_id, estado, referencia
                    from %s.ordenes
                    where reserva_id is not null
                    order by reserva_id,
                      case estado when 'APPROVED' then 1 when 'PENDING' then 2 else 3 end,
                      fecha_creacion desc
                    """.formatted(esquemaSql);
            Map<Integer, ResumenPagoReserva> resultado = new HashMap<>();
            db.sql(sql).query((rs, rowNum) -> {
                Integer id = rs.getInt("reserva_id");
                if (reservaIds.contains(id)) {
                    resultado.put(id, new ResumenPagoReserva(
                            rs.getString("estado"), rs.getString("referencia")));
                }
                return null;
            }).list();
            return resultado;
        } catch (DataAccessException ignored) {
            return Map.of();
        }
    }
}
