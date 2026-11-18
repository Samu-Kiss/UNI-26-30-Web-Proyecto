package com.typeerror.myt.api;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import com.typeerror.myt.entities.Resena;
import com.typeerror.myt.entities.RolUsuario;
import com.typeerror.myt.repository.ResenaRepository;
import com.typeerror.myt.repository.ReservaRepository;
import com.typeerror.myt.service.ContextoSesion;
import com.typeerror.myt.service.ResenaService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/resenas")
@Transactional(readOnly = true)
public class ResenaRestController {
    private final ResenaRepository repository;
    private final ReservaRepository reservas;
    private final ResenaService service;

    public ResenaRestController(ResenaRepository repository, ReservaRepository reservas, ResenaService service) {
        this.repository = repository;
        this.reservas = reservas;
        this.service = service;
    }

    public record Alta(@NotNull Integer reservaId, @NotNull @Min(1) @Max(5) Integer calificacion,
            @NotBlank @Size(max = 1000) String comentario) { }

    public record Detalle(Integer id, Integer reservaId, Integer tutorId, String tutor, String estudiante,
            Integer calificacion, String comentario, LocalDateTime fecha) { }

    @GetMapping
    public List<Detalle> listar(@RequestAttribute("apiSesion") ContextoSesion sesion,
            @RequestParam(required = false) Integer tutorId) {
        return repository.findAll().stream().filter(r -> tutorId != null
                ? r.getReserva().getTutor().getId().equals(tutorId)
                : switch (sesion.rol()) {
                    case ADMINISTRADOR -> true;
                    case TUTOR -> r.getReserva().getTutor().getId().equals(sesion.perfilId());
                    case ESTUDIANTE -> r.getReserva().getEstudiante().getId().equals(sesion.perfilId());
                }).map(this::dto).toList();
    }

    @PostMapping
    @Transactional
    public Detalle crear(@Valid @RequestBody Alta datos, @RequestAttribute("apiSesion") ContextoSesion sesion) {
        var reserva = reservas.findById(datos.reservaId()).orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reserva no encontrada"));
        if (sesion.rol() != RolUsuario.ESTUDIANTE
                || !reserva.getEstudiante().getId().equals(sesion.perfilId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo el estudiante puede reseñar su tutoría");
        }
        return dto(service.guardar(new Resena(null, reserva, datos.calificacion(), datos.comentario(), null)));
    }

    private Detalle dto(Resena r) {
        return new Detalle(r.getId(), r.getReserva().getId(), r.getReserva().getTutor().getId(),
                r.getReserva().getTutor().getUsuario().getNombre(),
                r.getReserva().getEstudiante().getUsuario().getNombre(),
                r.getCalificacion(), r.getComentario(), r.getFechaCreacion());
    }
}
