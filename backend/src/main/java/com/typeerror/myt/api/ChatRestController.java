package com.typeerror.myt.api;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import com.typeerror.myt.entities.Mensaje;
import com.typeerror.myt.entities.RolUsuario;
import com.typeerror.myt.repository.ReservaRepository;
import com.typeerror.myt.service.ChatService;
import com.typeerror.myt.service.ContextoSesion;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/chat/{reservaId}")
@Transactional
public class ChatRestController {
    private final ChatService chat;
    private final ReservaRepository reservas;

    public ChatRestController(ChatService chat, ReservaRepository reservas) {
        this.chat = chat;
        this.reservas = reservas;
    }

    public record Texto(@NotBlank @Size(max = 4000) String contenido) { }

    public record Detalle(Long id, String autor, String contenido, LocalDateTime fecha) { }

    @GetMapping
    public List<Detalle> listar(@PathVariable Integer reservaId,
            @RequestAttribute("apiSesion") ContextoSesion sesion) {
        Integer usuarioId = participante(reservaId, sesion);
        var conversacion = chat.obtenerOCrearConversacion(reservaId, usuarioId);
        return chat.listarMensajes(conversacion.getId(), usuarioId).stream().map(this::dto).toList();
    }

    @PostMapping
    public Detalle enviar(@PathVariable Integer reservaId, @Valid @RequestBody Texto texto,
            @RequestAttribute("apiSesion") ContextoSesion sesion) {
        Integer usuarioId = participante(reservaId, sesion);
        var conversacion = chat.obtenerOCrearConversacion(reservaId, usuarioId);
        return dto(chat.enviarMensaje(conversacion.getId(), usuarioId, texto.contenido()));
    }

    private Integer participante(Integer id, ContextoSesion sesion) {
        var reserva = reservas.findById(id).orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reserva no encontrada"));
        if (sesion.rol() == RolUsuario.TUTOR && reserva.getTutor().getId().equals(sesion.perfilId())) {
            return reserva.getTutor().getUsuario().getId();
        }
        if (sesion.rol() == RolUsuario.ESTUDIANTE && reserva.getEstudiante().getId().equals(sesion.perfilId())) {
            return reserva.getEstudiante().getUsuario().getId();
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "El chat es privado para los participantes");
    }

    private Detalle dto(Mensaje m) {
        return new Detalle(m.getId(), m.getRemitente().getNombre(),
                m.estaEliminado() ? "Mensaje eliminado" : m.getContenido(), m.getFechaEnvio());
    }
}
