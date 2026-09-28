package com.typeerror.myt.service;

import java.math.BigDecimal;
import java.util.EnumSet;
import java.util.List;
import java.util.HashSet;
import java.util.Set;
import java.util.Objects;
import java.util.Optional;

import com.typeerror.myt.errors.InformacionNoValidaException;
import com.typeerror.myt.errors.RolYaAsignadoException;
import com.typeerror.myt.errors.UsuarioNotFoundException;
import com.typeerror.myt.errors.UsuarioYaExistenteException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.typeerror.myt.entities.Usuario;
import com.typeerror.myt.entities.RolUsuario;
import com.typeerror.myt.entities.Materia;
import com.typeerror.myt.repository.MateriaRepository;
import com.typeerror.myt.entities.Estudiante;
import com.typeerror.myt.entities.Tutor;
import com.typeerror.myt.repository.UsuarioRepository;
import com.typeerror.myt.repository.EstudianteRepository;
import com.typeerror.myt.repository.TutorRepository;

@Service
public class RegistroUsuarioServiceImpl implements RegistroUsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final EstudianteRepository estudianteRepository;
    private final TutorRepository tutorRepository;
    private final PasswordEncoder passwordEncoder;
    private final MateriaRepository materiaRepository;

    public RegistroUsuarioServiceImpl(UsuarioRepository usuarioRepository,
            EstudianteRepository estudianteRepository,
            TutorRepository tutorRepository,
            PasswordEncoder passwordEncoder, MateriaRepository materiaRepository) {
        this.usuarioRepository = usuarioRepository;
        this.estudianteRepository = estudianteRepository;
        this.tutorRepository = tutorRepository;
        this.passwordEncoder = passwordEncoder;
        this.materiaRepository = materiaRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Usuario> findById(Integer id) {
        return usuarioRepository.findById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean puedeAsignarPerfil(Integer usuarioId) {
        return !consultarPerfilesDisponibles(usuarioId).isEmpty();
    }

    @Override
    @Transactional(readOnly = true)
    public Set<RolUsuario> perfilesDisponibles(Integer usuarioId) {
        return consultarPerfilesDisponibles(usuarioId);
    }

    private Set<RolUsuario> consultarPerfilesDisponibles(Integer usuarioId) {
        Set<RolUsuario> disponibles = EnumSet.of(RolUsuario.ESTUDIANTE, RolUsuario.TUTOR);
        if (estudianteRepository.existsByUsuarioId(usuarioId)) {
            disponibles.remove(RolUsuario.ESTUDIANTE);
        }
        if (tutorRepository.existsByUsuarioId(usuarioId)) {
            disponibles.remove(RolUsuario.TUTOR);
        }
        return disponibles;
    }

    @Override
    @Transactional
    public void registrarEstudiante(Usuario usuario, String codigoEstudiantil, String universidad,
            String programaAcademico, Integer semestre) {
        validarPerfilDisponible(usuario, RolUsuario.ESTUDIANTE);
        validarTexto(codigoEstudiantil, "El código estudiantil es obligatorio");
        validarTexto(universidad, "La universidad es obligatoria");
        validarTexto(programaAcademico, "El programa académico es obligatorio");
        if (semestre == null || semestre < 1 || semestre > 30) {
            throw new InformacionNoValidaException();
        }

        Usuario guardado = guardarCuentaParaPerfil(usuario, RolUsuario.ESTUDIANTE);
        estudianteRepository.save(new Estudiante(null, guardado, codigoEstudiantil.trim(),
                universidad.trim(), programaAcademico.trim(), semestre));
    }

    @Override
    @Transactional
    public void registrarTutor(Usuario usuario, String biografia, List<String> materias,
            BigDecimal tarifaPorHora) {
        validarPerfilDisponible(usuario, RolUsuario.TUTOR);
        if (materias == null || materias.isEmpty()) {
            throw new InformacionNoValidaException();
        }
        if (tarifaPorHora == null || tarifaPorHora.signum() <= 0) {
            throw new InformacionNoValidaException();
        }

        Set<Materia> asignaturas = new HashSet<>();
        for (String nombre : materias) {
            validarTexto(nombre, "El nombre de la materia es obligatorio");
            String normalizado = nombre.trim();
            if (normalizado.length() > 100) {
                throw new InformacionNoValidaException();
            }
            asignaturas.add(materiaRepository.findByNombre(normalizado)
                    .orElseGet(() -> materiaRepository.save(new Materia(null, normalizado))));
        }
        Usuario guardado = guardarCuentaParaPerfil(usuario, RolUsuario.TUTOR);
        tutorRepository.save(new Tutor(null, guardado, normalizarOpcional(biografia), asignaturas,
                tarifaPorHora, true));
    }

    private void validarCorreoDisponible(Usuario usuario) {
        Usuario encontrado = usuarioRepository.findByCorreoIgnoreCase(usuario.getCorreo()).orElse(null);
        if (encontrado != null && !Objects.equals(encontrado.getId(), usuario.getId())) {
            throw new UsuarioYaExistenteException(usuario.getCorreo());
        }
    }

    private Usuario guardarCuentaNueva(Usuario usuario) {
        usuario.setActivo(true);
        usuario.setContrasena(passwordEncoder.encode(usuario.getContrasena()));
        return usuarioRepository.save(usuario);
    }

    private Usuario guardarCuentaParaPerfil(Usuario usuario, RolUsuario rol) {
        if (usuario.getId() == null) {
            usuario.getRoles().add(rol);
            validarCorreoDisponible(usuario);
            return guardarCuentaNueva(usuario);
        }
        Usuario existente = usuarioRepository.findById(usuario.getId())
                .orElseThrow(() -> new UsuarioNotFoundException(usuario.getId()));
        existente.getRoles().add(rol);
        return usuarioRepository.save(existente);
    }

    private void validarPerfilDisponible(Usuario usuario, RolUsuario rol) {
        if (usuario.getId() == null) {
            return;
        }
        boolean existe = rol == RolUsuario.ESTUDIANTE
                ? estudianteRepository.existsByUsuarioId(usuario.getId())
                : tutorRepository.existsByUsuarioId(usuario.getId());
        if (existe) {
            throw new RolYaAsignadoException(rol.name());
        }
    }

    private void validarTexto(String valor, String mensaje) {
        if (valor == null || valor.isBlank()) {
            throw new IllegalArgumentException(mensaje);
        }
    }

    private String normalizarOpcional(String valor) {
        return valor == null || valor.isBlank() ? null : valor.trim();
    }

}
