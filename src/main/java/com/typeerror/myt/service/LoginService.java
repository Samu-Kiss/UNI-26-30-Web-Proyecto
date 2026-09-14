package com.typeerror.myt.service;

import java.util.Optional;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.typeerror.myt.entities.Administrador;
import com.typeerror.myt.entities.Cliente;
import com.typeerror.myt.repository.AdministradorRepository;
import com.typeerror.myt.repository.ClienteRepository;
import com.typeerror.myt.repository.EstudianteRepository;
import com.typeerror.myt.repository.TutorRepository;

@Service
@Transactional(readOnly = true)
public class LoginService {

    private final AdministradorRepository administradorRepository;
    private final ClienteRepository clienteRepository;
    private final EstudianteRepository estudianteRepository;
    private final TutorRepository tutorRepository;
    private final PasswordEncoder passwordEncoder;

    public LoginService(AdministradorRepository administradorRepository,
            ClienteRepository clienteRepository,
            EstudianteRepository estudianteRepository,
            TutorRepository tutorRepository,
            PasswordEncoder passwordEncoder) {
        this.administradorRepository = administradorRepository;
        this.clienteRepository = clienteRepository;
        this.estudianteRepository = estudianteRepository;
        this.tutorRepository = tutorRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public Optional<UsuarioAutenticado> autenticar(String correo, String contrasena) {
        if (correo == null || contrasena == null || correo.isBlank() || contrasena.isBlank()) {
            return Optional.empty();
        }

        Optional<Administrador> administrador = administradorRepository.findByCorreoIgnoreCase(correo.trim());
        if (administrador.filter(this::estaActivo)
                .filter(usuario -> passwordEncoder.matches(contrasena, usuario.getContrasena()))
                .isPresent()) {
            return Optional.of(new UsuarioAutenticado(RolUsuario.ADMINISTRADOR,
                    administrador.orElseThrow().getId()));
        }

        return clienteRepository.findByCorreoIgnoreCase(correo.trim())
                .filter(this::estaActivo)
                .filter(cliente -> passwordEncoder.matches(contrasena, cliente.getContrasena()))
                .flatMap(this::resolverPerfil);
    }

    private Optional<UsuarioAutenticado> resolverPerfil(Cliente cliente) {
        return estudianteRepository.findByClienteId(cliente.getId())
                .map(estudiante -> new UsuarioAutenticado(RolUsuario.ESTUDIANTE, estudiante.getId()))
                .or(() -> tutorRepository.findByClienteId(cliente.getId())
                        .map(tutor -> new UsuarioAutenticado(RolUsuario.TUTOR, tutor.getId())));
    }

    private boolean estaActivo(Administrador administrador) {
        return Boolean.TRUE.equals(administrador.getActivo());
    }

    private boolean estaActivo(Cliente cliente) {
        return Boolean.TRUE.equals(cliente.getActivo());
    }
}
