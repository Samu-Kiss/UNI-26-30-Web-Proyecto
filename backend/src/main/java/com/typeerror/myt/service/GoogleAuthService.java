package com.typeerror.myt.service;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.typeerror.myt.entities.Estudiante;
import com.typeerror.myt.entities.RolUsuario;
import com.typeerror.myt.entities.Usuario;
import com.typeerror.myt.repository.EstudianteRepository;
import com.typeerror.myt.repository.UsuarioRepository;

@Service
@Transactional
public class GoogleAuthService {

    private static final Pattern EMAIL_CLAIM = Pattern.compile("\"email\"\\s*:\\s*\"([^\"]+)\"");
    private static final Pattern NAME_CLAIM = Pattern.compile("\"name\"\\s*:\\s*\"([^\"]+)\"");

    private final UsuarioRepository usuarioRepository;
    private final EstudianteRepository estudianteRepository;
    private final LoginService loginService;
    private final PasswordEncoder passwordEncoder;
    private final boolean demoEnabled;

    public GoogleAuthService(
            UsuarioRepository usuarioRepository,
            EstudianteRepository estudianteRepository,
            LoginService loginService,
            PasswordEncoder passwordEncoder,
            @Value("${myt.google.demo-enabled:true}") boolean demoEnabled) {
        this.usuarioRepository = usuarioRepository;
        this.estudianteRepository = estudianteRepository;
        this.loginService = loginService;
        this.passwordEncoder = passwordEncoder;
        this.demoEnabled = demoEnabled;
    }

    public List<UsuarioAutenticado> autenticarConGoogle(
            String correo,
            String nombreCompleto,
            String credencialJwt) {
        String correoResuelto = null;
        String nombreResuelto = nombreCompleto;

        if (credencialJwt != null && !credencialJwt.isBlank()) {
            String[] partes = credencialJwt.trim().split("\\.");
            if (partes.length != 3) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "Credencial de Google no válida");
            }
            try {
                String payload = new String(
                        Base64.getUrlDecoder().decode(partes[1]),
                        StandardCharsets.UTF_8);
                Matcher emailMatcher = EMAIL_CLAIM.matcher(payload);
                if (!emailMatcher.find()) {
                    throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                            "Token de Google sin correo verificado");
                }
                correoResuelto = emailMatcher.group(1);
                Matcher nameMatcher = NAME_CLAIM.matcher(payload);
                if (nameMatcher.find() && (nombreResuelto == null || nombreResuelto.isBlank())) {
                    nombreResuelto = nameMatcher.group(1);
                }
            } catch (IllegalArgumentException ignored) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "Token de Google inválido");
            }
        } else if (demoEnabled) {
            correoResuelto = correo;
        } else {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Se requiere credencial de Google Identity Services");
        }

        if (correoResuelto == null || correoResuelto.isBlank() || !correoResuelto.contains("@")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Ingresa un correo válido de Google para continuar");
        }

        String correoLimpio = correoResuelto.trim().toLowerCase(Locale.ROOT);
        var existente = loginService.asegurarUsuario(correoLimpio);
        if (existente.isPresent()) {
            Usuario usuario = existente.get();
            if (!Boolean.TRUE.equals(usuario.getActivo())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Tu cuenta está desactivada. Comunícate con soporte para revisar tu perfil.");
            }
            return loginService.resolverPerfiles(usuario);
        }

        String[] partesNombre = separarNombre(nombreResuelto, correoLimpio);
        Usuario nuevo = new Usuario();
        nuevo.setNombre(partesNombre[0]);
        nuevo.setApellido(partesNombre[1]);
        nuevo.setCorreo(correoLimpio);
        nuevo.setContrasena(passwordEncoder.encode("GAuth-" + UUID.randomUUID()));
        nuevo.setActivo(true);
        nuevo.setRoles(new HashSet<>(Set.of(RolUsuario.ESTUDIANTE)));
        Usuario guardado = usuarioRepository.save(nuevo);

        Estudiante estudiante = estudianteRepository.save(new Estudiante(
                null,
                guardado,
                "GOOGLE-" + guardado.getId(),
                "Pontificia Universidad Javeriana",
                "Estudiante autenticado con Google",
                1));

        return List.of(new UsuarioAutenticado(RolUsuario.ESTUDIANTE, estudiante.getId()));
    }

    private String[] separarNombre(String nombreCompleto, String correo) {
        if (nombreCompleto != null && !nombreCompleto.isBlank()) {
            String[] partes = nombreCompleto.trim().split("\\s+", 2);
            if (partes.length == 2) {
                return new String[] {partes[0], partes[1]};
            }
            return new String[] {partes[0], "Google"};
        }
        String alias = correo.substring(0, correo.indexOf('@'))
                .replace('.', ' ')
                .replace('_', ' ')
                .trim();
        String capitalizado = alias.isEmpty() ? "Usuario"
                : Character.toUpperCase(alias.charAt(0)) + alias.substring(1);
        return new String[] {capitalizado, "Google"};
    }
}
