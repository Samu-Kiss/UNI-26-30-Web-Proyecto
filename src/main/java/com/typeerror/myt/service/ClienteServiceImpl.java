package com.typeerror.myt.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.typeerror.myt.entities.Cliente;
import com.typeerror.myt.entities.Estudiante;
import com.typeerror.myt.entities.Tutor;
import com.typeerror.myt.repository.ClienteRepository;
import com.typeerror.myt.repository.EstudianteRepository;
import com.typeerror.myt.repository.TutorRepository;

@Service
public class ClienteServiceImpl implements ClienteService {

    private final ClienteRepository clienteRepository;
    private final EstudianteRepository estudianteRepository;
    private final TutorRepository tutorRepository;
    private final PasswordEncoder passwordEncoder;

    public ClienteServiceImpl(ClienteRepository clienteRepository,
            EstudianteRepository estudianteRepository,
            TutorRepository tutorRepository,
            PasswordEncoder passwordEncoder) {
        this.clienteRepository = clienteRepository;
        this.estudianteRepository = estudianteRepository;
        this.tutorRepository = tutorRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Cliente> findById(Integer id) {
        return clienteRepository.findById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Cliente> findAll() {
        return clienteRepository.findAll(Sort.by(Sort.Direction.ASC, "id"));
    }

    @Override
    @Transactional(readOnly = true)
    public boolean puedeAsignarPerfil(Integer clienteId) {
        return !tienePerfilInterno(clienteId);
    }

    private boolean tienePerfilInterno(Integer clienteId) {
        return estudianteRepository.findByClienteId(clienteId).isPresent()
                || tutorRepository.findByClienteId(clienteId).isPresent();
    }

    @Override
    @Transactional
    public void guardar(Cliente cliente) {
        guardarInterno(cliente);
    }

    private Cliente guardarInterno(Cliente cliente) {
        validarCorreoDisponible(cliente);

        if (cliente.getId() == null) {
            return guardarCuentaNueva(cliente);
        }

        Cliente existente = clienteRepository.findById(cliente.getId())
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
    public void registrarEstudiante(Cliente cliente, String codigoEstudiantil, String universidad,
            String programaAcademico, Integer semestre) {
        validarPerfilDisponible(cliente);
        validarTexto(codigoEstudiantil, "El código estudiantil es obligatorio");
        validarTexto(universidad, "La universidad es obligatoria");
        validarTexto(programaAcademico, "El programa académico es obligatorio");
        if (semestre == null || semestre < 1 || semestre > 20) {
            throw new IllegalArgumentException("El semestre debe estar entre 1 y 20");
        }

        Cliente guardado = guardarCuentaParaPerfil(cliente);
        estudianteRepository.save(new Estudiante(null, guardado, codigoEstudiantil.trim(),
                universidad.trim(), programaAcademico.trim(), semestre));
    }

    @Override
    @Transactional
    public void registrarTutor(Cliente cliente, String biografia, List<String> materias,
            BigDecimal tarifaPorHora) {
        validarPerfilDisponible(cliente);
        if (materias == null || materias.isEmpty()) {
            throw new IllegalArgumentException("Registra al menos una materia");
        }
        if (tarifaPorHora == null || tarifaPorHora.signum() <= 0) {
            throw new IllegalArgumentException("La tarifa por hora debe ser mayor que cero");
        }

        Cliente guardado = guardarCuentaParaPerfil(cliente);
        tutorRepository.save(new Tutor(null, guardado, normalizarOpcional(biografia), materias,
                tarifaPorHora, null, true));
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

    private void validarCorreoDisponible(Cliente cliente) {
        Cliente encontrado = clienteRepository.findByCorreoIgnoreCase(cliente.getCorreo()).orElse(null);
        if (encontrado != null && !Objects.equals(encontrado.getId(), cliente.getId())) {
            throw new IllegalArgumentException("Ya existe un cliente con ese correo");
        }
    }

    private Cliente guardarCuentaNueva(Cliente cliente) {
        cliente.setActivo(true);
        cliente.setContrasena(passwordEncoder.encode(cliente.getContrasena()));
        return clienteRepository.save(cliente);
    }

    private Cliente guardarCuentaParaPerfil(Cliente cliente) {
        if (cliente.getId() == null) {
            validarCorreoDisponible(cliente);
            return guardarCuentaNueva(cliente);
        }
        return guardarInterno(cliente);
    }

    private void validarPerfilDisponible(Cliente cliente) {
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
