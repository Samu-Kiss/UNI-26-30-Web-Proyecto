package com.typeerror.myt.api;

import java.util.Arrays;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.typeerror.myt.controller.RegistroUsuarioForm;
import com.typeerror.myt.repository.UsuarioRepository;
import com.typeerror.myt.service.RegistroUsuarioService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;

import com.typeerror.myt.service.UsuarioService;
import jakarta.validation.constraints.Email;
import org.springframework.web.bind.annotation.PutMapping;

@RestController
@Tag(name = "Usuarios", description = "Consulta y registro de usuarios. Requiere sesión de administrador.")
@ApiResponse(responseCode = "401", description = "Sesión ausente o vencida",
        content = @Content(mediaType = "application/json", schema = @Schema(type = "object")))
@ApiResponse(responseCode = "403", description = "Perfil sin permisos o encabezado CSRF ausente",
        content = @Content(mediaType = "application/json", schema = @Schema(type = "object")))
@RequestMapping("/api/usuarios")
@Transactional(readOnly = true)
public class UsuarioRestController {
    private final UsuarioRepository usuarios;
    private final RegistroUsuarioService registro;
    private final UsuarioService usuarioService;

    public UsuarioRestController(UsuarioRepository usuarios, RegistroUsuarioService registro,
            UsuarioService usuarioService) {
        this.usuarios = usuarios;
        this.registro = registro;
        this.usuarioService = usuarioService;
    }

    @Getter
    @Setter
    public static class Registro extends RegistroUsuarioForm {
        @NotBlank
        @Size(min = 8, max = 72)
        private String contrasena;
        @NotBlank
        private String rol;
        private String codigoEstudiantil;
        private String universidad;
        private String programaAcademico;
        private Integer semestre;
        @Size(max = 2000)
        private String biografia;
        private String materias;
        private java.math.BigDecimal tarifaPorHora;

        @Override
        public com.typeerror.myt.entities.Usuario toEntity() {
            var usuario = super.toEntity();
            usuario.setContrasena(contrasena);
            return usuario;
        }
    }

    @GetMapping
    @Operation(summary = "Listar usuarios", description = "Consulta usuarios sin exponer contraseñas.")
    @ApiResponse(responseCode = "200", description = "Consulta exitosa")
    public List<ApiDtos.UsuarioDto> listar() {
        return usuarios.findAll().stream().map(ApiDtos::usuario).toList();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Consultar usuario por identificador")
    @ApiResponse(responseCode = "200", description = "Usuario encontrado")
    @ApiResponse(responseCode = "404", description = "No existe un usuario con ese identificador",
            content = @Content)
    public ResponseEntity<ApiDtos.UsuarioDto> consultar(
            @Parameter(description = "Identificador del usuario", example = "1") @PathVariable Integer id) {
        return usuarios.findById(id).map(u -> ResponseEntity.ok(ApiDtos.usuario(u)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    @Operation(summary = "Registrar usuario", description = "Crea una cuenta con perfil ESTUDIANTE o TUTOR.")
    @ApiResponse(responseCode = "201", description = "Usuario registrado; respuesta sin cuerpo")
    @ApiResponse(responseCode = "400", description = "Datos de registro inválidos")
    @Transactional
    public ResponseEntity<Void> registrar(@Valid @RequestBody Registro datos) {
        var usuario = datos.toEntity();
        switch (datos.getRol()) {
            case "ESTUDIANTE" -> registro.registrarEstudiante(usuario, datos.getCodigoEstudiantil(),
                    datos.getUniversidad(), datos.getProgramaAcademico(), datos.getSemestre());
            case "TUTOR" -> registro.registrarTutor(usuario, datos.getBiografia(),
                    Arrays.stream((datos.getMaterias() == null ? "" : datos.getMaterias()).split(","))
                            .filter(m -> !m.isBlank()).toList(), datos.getTarifaPorHora());
            default -> {
                return ResponseEntity.badRequest().build();
            }
        }
        return ResponseEntity.status(201).build();
    }

    public record EdicionUsuario(
            @NotBlank @Size(max = 100) String nombre,
            @NotBlank @Size(max = 100) String apellido,
            @NotBlank @Email @Size(max = 150) String correo,
            @Size(max = 30) String telefono) { }

    @PutMapping("/{id}")
    @Operation(summary = "Actualizar datos de usuario")
    @Transactional
    public ResponseEntity<ApiDtos.UsuarioDto> actualizar(
            @PathVariable Integer id,
            @Valid @RequestBody EdicionUsuario datos) {
        return usuarios.findById(id).map(u -> {
            u.setNombre(datos.nombre());
            u.setApellido(datos.apellido());
            u.setCorreo(datos.correo());
            u.setTelefono(datos.telefono());
            return ResponseEntity.ok(ApiDtos.usuario(usuarios.save(u)));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    public record EstadoUsuarioDto(Boolean activo) { }

    @PutMapping("/{id}/activo")
    @Operation(summary = "Activar o desactivar usuario")
    @Transactional
    public ResponseEntity<Void> cambiarEstado(
            @PathVariable Integer id,
            @RequestBody EstadoUsuarioDto datos) {
        if (Boolean.TRUE.equals(datos.activo())) {
            usuarioService.activar(id);
        } else {
            usuarioService.desactivar(id);
        }
        return ResponseEntity.noContent().build();
    }

    @org.springframework.web.bind.annotation.DeleteMapping("/{id}")
    @Operation(summary = "Eliminar usuario por identificador")
    @Transactional
    public ResponseEntity<Void> eliminar(@PathVariable Integer id) {
        if (!usuarios.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        try {
            usuarios.deleteById(id);
        } catch (Exception e) {
            usuarioService.desactivar(id);
        }
        return ResponseEntity.noContent().build();
    }

    @Getter
    @Setter
    public static class PerfilAlta {
        @NotBlank
        private String rol;
        private String codigoEstudiantil;
        private String universidad;
        private String programaAcademico;
        private Integer semestre;
        @Size(max = 2000)
        private String biografia;
        private String materias;
        private java.math.BigDecimal tarifaPorHora;
    }

    @PostMapping("/{id}/perfiles")
    @Operation(summary = "Asociar nuevo perfil a usuario existente")
    @Transactional
    public ResponseEntity<Void> agregarPerfil(
            @PathVariable Integer id,
            @Valid @RequestBody PerfilAlta datos) {
        var usuario = usuarios.findById(id);
        if (usuario.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        switch (datos.getRol()) {
            case "ESTUDIANTE" -> registro.registrarEstudiante(usuario.get(), datos.getCodigoEstudiantil(),
                    datos.getUniversidad(), datos.getProgramaAcademico(), datos.getSemestre());
            case "TUTOR" -> registro.registrarTutor(usuario.get(), datos.getBiografia(),
                    Arrays.stream((datos.getMaterias() == null ? "" : datos.getMaterias()).split(","))
                            .map(String::trim).filter(m -> !m.isBlank()).toList(), datos.getTarifaPorHora());
            case "ADMINISTRADOR" -> {
                var u = usuario.get();
                u.getRoles().add(com.typeerror.myt.entities.RolUsuario.ADMINISTRADOR);
                usuarios.save(u);
            }
            default -> {
                return ResponseEntity.badRequest().build();
            }
        }
        return ResponseEntity.status(201).build();
    }
}
