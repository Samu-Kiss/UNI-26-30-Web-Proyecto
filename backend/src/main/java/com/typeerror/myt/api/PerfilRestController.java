package com.typeerror.myt.api;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.typeerror.myt.entities.Usuario;
import com.typeerror.myt.repository.EstudianteRepository;
import com.typeerror.myt.repository.TutorRepository;
import com.typeerror.myt.repository.UsuarioRepository;
import com.typeerror.myt.service.ContextoSesion;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/perfil")
@Transactional(readOnly = true)
public class PerfilRestController {
    private final UsuarioRepository usuarios;
    private final TutorRepository tutores;
    private final EstudianteRepository estudiantes;

    public PerfilRestController(UsuarioRepository usuarios, TutorRepository tutores,
            EstudianteRepository estudiantes) {
        this.usuarios = usuarios;
        this.tutores = tutores;
        this.estudiantes = estudiantes;
    }

    @GetMapping
    public ApiDtos.UsuarioDto consultar(@RequestAttribute("apiSesion") ContextoSesion sesion) {
        return ApiDtos.usuario(usuario(sesion));
    }

    @PutMapping
    @Transactional
    public ApiDtos.UsuarioDto guardar(@RequestAttribute("apiSesion") ContextoSesion sesion,
            @Valid @RequestBody UsuarioRestController.EdicionUsuario datos) {
        Usuario u = usuario(sesion);
        u.setNombre(datos.nombre().trim());
        u.setApellido(datos.apellido().trim());
        u.setCorreo(datos.correo().trim());
        u.setTelefono(datos.telefono());
        return ApiDtos.usuario(usuarios.save(u));
    }

    private Usuario usuario(ContextoSesion sesion) {
        return switch (sesion.rol()) {
            case ADMINISTRADOR -> usuarios.findById(sesion.perfilId()).orElseThrow();
            case TUTOR -> tutores.findById(sesion.perfilId()).orElseThrow().getUsuario();
            case ESTUDIANTE -> estudiantes.findOneById(sesion.perfilId()).orElseThrow().getUsuario();
        };
    }
}
