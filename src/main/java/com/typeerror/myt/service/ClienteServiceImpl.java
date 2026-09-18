package com.typeerror.myt.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.HashSet;
import java.util.Set;
import java.util.Objects;
import java.util.Optional;

import org.springframework.data.domain.Sort;
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
public class ClienteServiceImpl implements ClienteService {

    private final UsuarioRepository clienteRepository;
    private final EstudianteRepository estudianteRepository;
    private final TutorRepository tutorRepository;
    private final PasswordEncoder passwordEncoder;
    private final MateriaRepository materiaRepository;

    public ClienteServiceImpl(UsuarioRepository clienteRepository,
            EstudianteRepository estudianteRepository,
            TutorRepository tutorRepository,
            PasswordEncoder passwordEncoder, MateriaRepository materiaRepository) {
        this.clienteRepository = clienteRepository;
        this.estudianteRepository = estudianteRepository;
        this.tutorRepository = tutorRepository;
        this.passwordEncoder = passwordEncoder;
        this.materiaRepository = materiaRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Usuario> findById(Integer id) {
        return clienteRepository.findById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Usuario> findAll() {
        return clienteRepository.findAll(Sort.by(Sort.Direction.ASC, "id"));
    }

    @Override
    @Transactional(readOnly = true)
    public boolean puedeAsignarPerfil(Integer clienteId) {
        return !tienePerfilInterno(clienteId);
    }

    private boolean tienePerfilInterno(Integer clienteId) {
        return estudianteRepository.findByUsuarioId(clienteId).isPresent()
                || tutorRepository.findByUsuarioId(clienteId).isPresent();
    }

    @Override
    @Transactional
    public void guardar(Usuario cliente) {
        guardarInterno(cliente);
    }

    private Usuario guardarInterno(Usuario cliente) {
        validarCorreoDisponible(cliente);

        if (cliente.getId() == null) {
            return guardarCuentaNueva(cliente);
        }

        Usuario existente = clienteRepository.findById(cliente.getId())
                .orElseThrow(() -> new IllegalArgumentException("El cliente no existe"));
        existente.setNombre(cliente.getNombre());
        existente.setApellido(cliente.getApellido());
        existente.setCorreo(cliente.getCorreo());
        if (cliente.getContrasena() != null && !cliente.getContrasena().isBlank()) {
            existente.setContrasena(passwordEncoder.encode(cliente.getContrasena()));
        }
        existente.setTelefono(cliente.getTelefono());
        return clienteRepository.save(existente);
    }

    @Override
    @Transactional
    public void registrarEstudiante(Usuario cliente, String codigoEstudiantil, String universidad,
            String programaAcademico, Integer semestre) {
        validarPerfilDisponible(cliente);
        validarTexto(codigoEstudiantil, "El código estudiantil es obligatorio");
        validarTexto(universidad, "La universidad es obligatoria");
        validarTexto(programaAcademico, "El programa académico es obligatorio");
        if (semestre == null || semestre < 1 || semestre > 30) {
            throw new IllegalArgumentException("El semestre debe estar entre 1 y 30");
        }

        Usuario guardado = guardarCuentaParaPerfil(cliente, RolUsuario.ESTUDIANTE);
        estudianteRepository.save(new Estudiante(null, guardado, codigoEstudiantil.trim(),
                universidad.trim(), programaAcademico.trim(), semestre));
    }

    @Override
    @Transactional
    public void registrarTutor(Usuario cliente, String biografia, List<String> materias,
            BigDecimal tarifaPorHora) {
        validarPerfilDisponible(cliente);
        if (materias == null || materias.isEmpty()) {
            throw new IllegalArgumentException("Registra al menos una materia");
        }
        if (tarifaPorHora == null || tarifaPorHora.signum() <= 0) {
            throw new IllegalArgumentException("La tarifa por hora debe ser mayor que cero");
        }

        Set<Materia> asignaturas = new HashSet<>();
        for (String nombre : materias) {
            validarTexto(nombre, "El nombre de la materia es obligatorio");
            String normalizado = nombre.trim();
            if (normalizado.length() > 100) {
                throw new IllegalArgumentException("La materia no puede superar 100 caracteres");
            }
            asignaturas.add(materiaRepository.findByNombre(normalizado)
                    .orElseGet(() -> materiaRepository.save(new Materia(null, normalizado))));
        }
        Usuario guardado = guardarCuentaParaPerfil(cliente, RolUsuario.TUTOR);
        tutorRepository.save(new Tutor(null, guardado, normalizarOpcional(biografia), asignaturas,
                tarifaPorHora, true));
    }

    @Override
    @Transactional
    public void desactivar(Integer id) {
        cambiarEstado(id, false);
    }

    @Override
    @Transactional
    public void activar(Integer id) {
        cambiarEstado(id, true);
    }

    private void cambiarEstado(Integer id, boolean activo) {
        clienteRepository.findById(id).ifPresent(cliente -> {
            cliente.setActivo(activo);
            clienteRepository.save(cliente);
        });
    }

    private void validarCorreoDisponible(Usuario cliente) {
        Usuario encontrado = clienteRepository.findByCorreoIgnoreCase(cliente.getCorreo()).orElse(null);
        if (encontrado != null && !Objects.equals(encontrado.getId(), cliente.getId())) {
            throw new IllegalArgumentException("Ya existe un cliente con ese correo");
        }
    }

    private Usuario guardarCuentaNueva(Usuario cliente) {
        cliente.setActivo(true);
        cliente.setContrasena(passwordEncoder.encode(cliente.getContrasena()));
        return clienteRepository.save(cliente);
    }

    private Usuario guardarCuentaParaPerfil(Usuario cliente, RolUsuario rol) {
        if (cliente.getId() != null) {
            Usuario existente = clienteRepository.findById(cliente.getId())
                    .orElseThrow(() -> new IllegalArgumentException("El usuario no existe"));
            existente.getRoles().add(rol);
        } else {
            cliente.getRoles().add(rol);
        }
        if (cliente.getId() == null) {
            validarCorreoDisponible(cliente);
            return guardarCuentaNueva(cliente);
        }
        return guardarInterno(cliente);
    }

    private void validarPerfilDisponible(Usuario cliente) {
        if (cliente.getId() != null && tienePerfilInterno(cliente.getId())) {
            throw new IllegalArgumentException("La cuenta ya tiene un perfil asignado");
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
