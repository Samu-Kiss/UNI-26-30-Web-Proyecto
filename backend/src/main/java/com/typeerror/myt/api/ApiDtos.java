package com.typeerror.myt.api;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;
import com.typeerror.myt.entities.EstadoReserva;
import com.typeerror.myt.entities.ModalidadReserva;
import com.typeerror.myt.entities.Reserva;
import com.typeerror.myt.entities.RolUsuario;
import com.typeerror.myt.entities.Tutor;
import com.typeerror.myt.entities.Usuario;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public final class ApiDtos {
    private ApiDtos() { }

    public record MateriaDto(Integer id, String nombre) { }

    public record TutorDto(Integer id, Integer usuarioId, String nombre, String biografia,
            BigDecimal tarifaPorHora, Boolean disponible, List<MateriaDto> materias, Double calificacion) { }

    public record TutorAlta(@NotNull @Positive Integer usuarioId, @NotBlank @Size(max = 2000) String biografia,
            @NotNull @DecimalMin("1") @DecimalMax("9999999999.99") BigDecimal tarifaPorHora,
            @NotEmpty Set<@NotNull @Positive Integer> materiaIds) { }

    public record TutorEdicion(@NotBlank @Size(max = 2000) String biografia,
            @NotNull @DecimalMin("1") @DecimalMax("9999999999.99") BigDecimal tarifaPorHora,
            @NotNull Boolean disponible) { }

    public record ReservaAlta(@NotNull @Positive Integer tutorId, @NotNull @Positive Integer materiaId,
            @NotNull @FutureOrPresent LocalDate fecha, @NotNull LocalTime horaInicio,
            @NotNull @Min(15) @Max(480) Integer duracionMinutos,
            @NotBlank @Size(max = 300) String tema, @NotNull ModalidadReserva modalidad) { }

    public record EstadoEdicion(@NotNull EstadoReserva estado, @Size(max = 500) String motivo) { }

    public record ReservaDto(Integer id, Integer tutorId, Integer estudianteId, String tutor,
            String estudiante, String materia, LocalDate fecha, LocalTime horaInicio, Integer duracionMinutos,
            String tema, EstadoReserva estado, BigDecimal costoTotal) { }

    public record UsuarioDto(Integer id, String nombre, String apellido, String correo, String telefono,
            Boolean activo, Set<RolUsuario> roles) { }

    public static TutorDto tutor(Tutor t, Double calificacion) {
        return new TutorDto(t.getId(), t.getUsuario().getId(),
                t.getUsuario().getNombre() + " " + t.getUsuario().getApellido(), t.getBiografia(),
                t.getTarifaPorHora(), t.getDisponible(), t.getMaterias().stream()
                    .map(m -> new MateriaDto(m.getId(), m.getNombre()))
                    .sorted(java.util.Comparator.comparing(MateriaDto::id)).toList(), calificacion);
    }

    public static UsuarioDto usuario(Usuario u) {
        return new UsuarioDto(u.getId(), u.getNombre(), u.getApellido(), u.getCorreo(), u.getTelefono(),
                u.getActivo(), Set.copyOf(u.getRoles()));
    }

    public static ReservaDto reserva(Reserva r) {
        return new ReservaDto(r.getId(), r.getTutor().getId(), r.getEstudiante().getId(),
                r.getTutor().getUsuario().getNombre(), r.getEstudiante().getUsuario().getNombre(),
                r.getMateria().getNombre(), r.getFecha(), r.getHoraInicio(), r.getDuracionMinutos(),
                r.getTema(), r.getEstado(), r.getCostoTotal());
    }
}
