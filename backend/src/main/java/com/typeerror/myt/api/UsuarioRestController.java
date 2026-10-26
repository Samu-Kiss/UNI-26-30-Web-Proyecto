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

@RestController
@RequestMapping("/api/usuarios")
@Transactional(readOnly = true)
public class UsuarioRestController {
    private final UsuarioRepository usuarios;
    private final RegistroUsuarioService registro;

    public UsuarioRestController(UsuarioRepository usuarios, RegistroUsuarioService registro) {
        this.usuarios = usuarios;
        this.registro = registro;
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
    public List<ApiDtos.UsuarioDto> listar() {
        return usuarios.findAll().stream().map(ApiDtos::usuario).toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiDtos.UsuarioDto> consultar(@PathVariable Integer id) {
        return usuarios.findById(id).map(u -> ResponseEntity.ok(ApiDtos.usuario(u)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
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
}
