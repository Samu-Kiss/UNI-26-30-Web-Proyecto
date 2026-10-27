package com.typeerror.myt.api;

import java.math.BigDecimal;
import java.net.URI;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
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
import com.typeerror.myt.entities.RolUsuario;
import com.typeerror.myt.entities.Tutor;
import com.typeerror.myt.repository.MateriaRepository;
import com.typeerror.myt.repository.TutorRepository;
import com.typeerror.myt.repository.UsuarioRepository;
import com.typeerror.myt.service.ContextoSesion;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/tutores")
@Transactional(readOnly = true)
public class TutorRestController {
    private final TutorRepository tutores;
    private final UsuarioRepository usuarios;
    private final MateriaRepository materias;

    public TutorRestController(TutorRepository tutores, UsuarioRepository usuarios, MateriaRepository materias) {
        this.tutores = tutores;
        this.usuarios = usuarios;
        this.materias = materias;
    }

    @GetMapping
    public ResponseEntity<Page<ApiDtos.TutorDto>> listar(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size, @RequestParam(required = false) Integer materiaId,
            @RequestParam(required = false) BigDecimal tarifaMax) {
        if (page < 0 || size < 1 || size > 50 || (tarifaMax != null && tarifaMax.signum() < 0)) {
            return ResponseEntity.badRequest().build();
        }
        var pagina = tutores.buscar(materiaId, tarifaMax, PageRequest.of(page, size, Sort.by("id")));
        var ids = pagina.getContent().stream().map(Tutor::getId).toList();
        Map<Integer, Double> promedios = ids.isEmpty() ? Map.of()
                : tutores.findCalificacionesPromedioByTutorIds(ids).stream()
                        .collect(Collectors.toMap(
                                TutorRepository.CalificacionTutor::getTutorId,
                                TutorRepository.CalificacionTutor::getPromedio));
        return ResponseEntity.ok(pagina.map(t -> ApiDtos.tutor(t, promedios.get(t.getId()))));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiDtos.TutorDto> consultar(@PathVariable Integer id) {
        return tutores.findById(id).map(t -> ResponseEntity.ok(dto(t)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/materias")
    public List<ApiDtos.MateriaDto> materias() {
        return materias.findAll(Sort.by("id")).stream()
                .map(m -> new ApiDtos.MateriaDto(m.getId(), m.getNombre())).toList();
    }

    @PostMapping
    @Transactional
    public ResponseEntity<ApiDtos.TutorDto> crear(@Valid @RequestBody ApiDtos.TutorAlta datos,
            @RequestAttribute("apiSesion") ContextoSesion sesion) {
        administrador(sesion);
        var usuario = usuarios.findById(datos.usuarioId()).orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
        if (!Boolean.TRUE.equals(usuario.getActivo()) || tutores.existsByUsuarioId(usuario.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "La cuenta está inactiva o ya tiene tutor");
        }
        var asignaturas = materias.findAllById(datos.materiaIds());
        if (asignaturas.size() != datos.materiaIds().size()) {
            return ResponseEntity.badRequest().build();
        }
        usuario.getRoles().add(RolUsuario.TUTOR);
        usuarios.save(usuario);
        Tutor tutor = tutores.save(new Tutor(null, usuario, datos.biografia(), new HashSet<>(asignaturas),
                datos.tarifaPorHora(), true));
        return ResponseEntity.created(URI.create("/api/tutores/" + tutor.getId()))
                .body(ApiDtos.tutor(tutor, null));
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<ApiDtos.TutorDto> editar(@PathVariable Integer id,
            @Valid @RequestBody ApiDtos.TutorEdicion datos,
            @RequestAttribute("apiSesion") ContextoSesion sesion) {
        propietario(sesion, id);
        return tutores.findById(id).map(t -> {
            t.setBiografia(datos.biografia());
            t.setTarifaPorHora(datos.tarifaPorHora());
            t.setDisponible(datos.disponible());
            return ResponseEntity.ok(dto(tutores.save(t)));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> desactivar(@PathVariable Integer id,
            @RequestAttribute("apiSesion") ContextoSesion sesion) {
        propietario(sesion, id);
        var tutor = tutores.findById(id);
        if (tutor.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        tutor.get().setDisponible(false);
        tutores.save(tutor.get());
        return ResponseEntity.noContent().build();
    }

    private ApiDtos.TutorDto dto(Tutor tutor) {
        return ApiDtos.tutor(tutor, tutores.findCalificacionPromedioByTutorId(tutor.getId()).orElse(null));
    }

    private void propietario(ContextoSesion sesion, Integer id) {
        if (sesion.rol() != RolUsuario.ADMINISTRADOR
                && !(sesion.rol() == RolUsuario.TUTOR && sesion.perfilId().equals(id))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo puedes modificar tu perfil de tutor");
        }
    }

    private void administrador(ContextoSesion sesion) {
        if (sesion.rol() != RolUsuario.ADMINISTRADOR) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Se requiere administrador");
        }
    }
}
