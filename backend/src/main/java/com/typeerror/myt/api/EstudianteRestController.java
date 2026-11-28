package com.typeerror.myt.api;

import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.typeerror.myt.service.EstudianteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@Tag(name = "Estudiantes",
        description = "Consulta del perfil académico de estudiantes. Requiere sesión de administrador.")
@RequestMapping("/api/estudiantes")
@Transactional(readOnly = true)
public class EstudianteRestController {
    private final EstudianteService estudianteService;

    public EstudianteRestController(EstudianteService estudianteService) {
        this.estudianteService = estudianteService;
    }

    public record EstudianteDto(
            Integer id,
            Integer usuarioId,
            String nombreCompleto,
            String correo,
            String codigoEstudiantil,
            String universidad,
            String programaAcademico,
            Integer semestre,
            Boolean activo
    ) { }

    @GetMapping
    @Operation(summary = "Listar estudiantes con información académica real")
    public List<EstudianteDto> listar() {
        return estudianteService.findAll().stream().map(e -> new EstudianteDto(
                e.getId(),
                e.getUsuario().getId(),
                e.getUsuario().getNombre() + " " + e.getUsuario().getApellido(),
                e.getUsuario().getCorreo(),
                e.getCodigoEstudiantil(),
                e.getUniversidad(),
                e.getProgramaAcademico(),
                e.getSemestre(),
                e.getUsuario().getActivo()
        )).toList();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Consultar estudiante por identificador")
    public ResponseEntity<EstudianteDto> consultar(@PathVariable Integer id) {
        return estudianteService.findById(id).map(e -> ResponseEntity.ok(new EstudianteDto(
                e.getId(),
                e.getUsuario().getId(),
                e.getUsuario().getNombre() + " " + e.getUsuario().getApellido(),
                e.getUsuario().getCorreo(),
                e.getCodigoEstudiantil(),
                e.getUniversidad(),
                e.getProgramaAcademico(),
                e.getSemestre(),
                e.getUsuario().getActivo()
        ))).orElseGet(() -> ResponseEntity.notFound().build());
    }
}
