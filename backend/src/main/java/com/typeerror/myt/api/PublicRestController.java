package com.typeerror.myt.api;

import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.typeerror.myt.repository.MateriaRepository;
import com.typeerror.myt.repository.TutorRepository;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@Tag(name = "Público", description = "Endpoints públicos de consulta sin autenticación")
@RequestMapping("/api/public")
@Transactional(readOnly = true)
public class PublicRestController {

    private final TutorRepository tutores;
    private final MateriaRepository materias;

    public PublicRestController(TutorRepository tutores, MateriaRepository materias) {
        this.tutores = tutores;
        this.materias = materias;
    }

    public record EstadisticasPublicasDto(
            String plataforma,
            String estado,
            long tutoresDisponibles,
            long materiasActivas,
            List<ApiDtos.MateriaDto> materias) { }

    @GetMapping("/estadisticas")
    @Operation(summary = "Consultar estadísticas públicas de la plataforma",
            description = "Endpoint público accesible sin autenticación para landing y monitoreo.")
    @ApiResponse(responseCode = "200", description = "Información pública obtenida")
    public EstadisticasPublicasDto estadisticas() {
        long disponibles = tutores.findAll().stream()
                .filter(t -> Boolean.TRUE.equals(t.getDisponible())
                        && Boolean.TRUE.equals(t.getUsuario().getActivo()))
                .count();
        var listaMaterias = materias.findAll(Sort.by("id")).stream()
                .map(m -> new ApiDtos.MateriaDto(m.getId(), m.getNombre()))
                .toList();
        return new EstadisticasPublicasDto(
                "MyT — Plataforma de Tutorías Académicas",
                "OPERATIVO",
                disponibles,
                listaMaterias.size(),
                listaMaterias);
    }
}
