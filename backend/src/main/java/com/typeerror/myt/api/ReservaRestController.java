package com.typeerror.myt.api;

import java.net.URI;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import com.typeerror.myt.entities.EstadoReserva;
import com.typeerror.myt.entities.Reserva;
import com.typeerror.myt.entities.RolUsuario;
import com.typeerror.myt.repository.ReservaRepository;
import com.typeerror.myt.repository.TutorRepository;
import com.typeerror.myt.service.ContextoSesion;
import com.typeerror.myt.service.ReservaService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/reservas")
@Transactional(readOnly = true)
public class ReservaRestController {
    private final ReservaService reservas;
    private final ReservaRepository repository;
    private final TutorRepository tutores;

    public ReservaRestController(ReservaService reservas, ReservaRepository repository, TutorRepository tutores) {
        this.reservas = reservas;
        this.repository = repository;
        this.tutores = tutores;
    }

    @GetMapping
    public List<ApiDtos.ReservaDto> listar(@RequestAttribute("apiSesion") ContextoSesion sesion,
            @RequestParam(required = false) EstadoReserva estado) {
        var lista = switch (sesion.rol()) {
            case ADMINISTRADOR -> reservas.findAll();
            case TUTOR -> reservas.findByTutorId(sesion.perfilId());
            case ESTUDIANTE -> repository.buscarPorEstudiante(sesion.perfilId(), estado);
        };
        return lista.stream().filter(r -> estado == null || r.getEstado() == estado)
                .map(ApiDtos::reserva).toList();
    }

    @PostMapping
    @Transactional
    public ResponseEntity<ApiDtos.ReservaDto> crear(@Valid @RequestBody ApiDtos.ReservaAlta datos,
            @RequestAttribute("apiSesion") ContextoSesion sesion) {
        if (sesion.rol() != RolUsuario.ESTUDIANTE) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Selecciona el perfil estudiante para reservar");
        }
        // Serialize bookings for a tutor so two concurrent requests cannot reserve the same interval.
        var tutor = tutores.bloquearPorId(datos.tutorId()).orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tutor no encontrado"));
        if (tutor.getMaterias().stream().noneMatch(m -> m.getId().equals(datos.materiaId()))
                || !Boolean.TRUE.equals(tutor.getUsuario().getActivo())) {
            return ResponseEntity.badRequest().build();
        }
        var reserva = reservas.crearReserva(datos.tutorId(), sesion.perfilId(), datos.materiaId(),
                datos.fecha(), datos.horaInicio(), datos.duracionMinutos(), datos.tema(), datos.modalidad());
        return ResponseEntity.created(URI.create("/api/reservas/" + reserva.getId())).body(ApiDtos.reserva(reserva));
    }

    @PutMapping("/{id}/estado")
    @Transactional
    public ResponseEntity<ApiDtos.ReservaDto> estado(@PathVariable Integer id,
            @Valid @RequestBody ApiDtos.EstadoEdicion datos,
            @RequestAttribute("apiSesion") ContextoSesion sesion) {
        var reserva = obtener(id);
        autorizar(sesion, reserva);
        if (sesion.rol() == RolUsuario.ESTUDIANTE && datos.estado() != EstadoReserva.CANCELADA) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Un estudiante solo puede cancelar");
        }
        return ResponseEntity.ok(ApiDtos.reserva(reservas.cambiarEstado(id, datos.estado(), datos.motivo())));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> cancelar(@PathVariable Integer id,
            @RequestAttribute("apiSesion") ContextoSesion sesion) {
        var reserva = obtener(id);
        autorizar(sesion, reserva);
        if (reserva.getEstado() != EstadoReserva.CANCELADA) {
            reservas.cambiarEstado(id, EstadoReserva.CANCELADA, "Cancelada desde la gestión de reservas");
        }
        return ResponseEntity.noContent().build();
    }

    private Reserva obtener(Integer id) {
        return reservas.findById(id).orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reserva no encontrada"));
    }

    private void autorizar(ContextoSesion sesion, Reserva reserva) {
        boolean propia = switch (sesion.rol()) {
            case ADMINISTRADOR -> true;
            case TUTOR -> reserva.getTutor().getId().equals(sesion.perfilId());
            case ESTUDIANTE -> reserva.getEstudiante().getId().equals(sesion.perfilId());
        };
        if (!propia) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "La reserva pertenece a otro perfil");
        }
    }
}
