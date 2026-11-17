package com.typeerror.myt.service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Locale;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.typeerror.myt.entities.TokenRecuperacion;
import com.typeerror.myt.entities.Usuario;
import com.typeerror.myt.repository.TokenRecuperacionRepository;
import com.typeerror.myt.repository.UsuarioRepository;

@Service
@Transactional
public class PasswordRecoveryService {

    private static final int MINUTOS_VIGENCIA = 15;
    private static final String ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    private final UsuarioRepository usuarioRepository;
    private final TokenRecuperacionRepository tokenRepository;
    private final LoginService loginService;
    private final PasswordEncoder passwordEncoder;
    private final InMemoryUserDetailsManager inMemoryUserDetailsManager;
    private final SecureRandom secureRandom = new SecureRandom();

    public PasswordRecoveryService(
            UsuarioRepository usuarioRepository,
            TokenRecuperacionRepository tokenRepository,
            LoginService loginService,
            PasswordEncoder passwordEncoder,
            InMemoryUserDetailsManager inMemoryUserDetailsManager) {
        this.usuarioRepository = usuarioRepository;
        this.tokenRepository = tokenRepository;
        this.loginService = loginService;
        this.passwordEncoder = passwordEncoder;
        this.inMemoryUserDetailsManager = inMemoryUserDetailsManager;
    }

    public record SolicitudRecuperacionDto(
            String mensaje,
            String tokenRecuperacion,
            int expiraEnMinutos) { }

    public SolicitudRecuperacionDto solicitarRecuperacion(String correo) {
        Usuario usuario = loginService.asegurarUsuario(correo)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "No encontramos una cuenta asociada al correo ingresado"));
        if (!Boolean.TRUE.equals(usuario.getActivo())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Tu cuenta está desactivada. Comunícate con soporte.");
        }

        tokenRepository.deleteByUsuarioId(usuario.getId());
        String codigo = generarCodigo();
        TokenRecuperacion entidad = new TokenRecuperacion(
                null,
                usuario,
                codigo,
                LocalDateTime.now(ZoneOffset.UTC).plusMinutes(MINUTOS_VIGENCIA),
                false,
                LocalDateTime.now(ZoneOffset.UTC));
        tokenRepository.save(entidad);

        return new SolicitudRecuperacionDto(
                "Se ha generado un código temporal de recuperación para tu cuenta.",
                codigo,
                MINUTOS_VIGENCIA);
    }

    public void restablecerContrasena(String token, String nuevaContrasena) {
        if (token == null || token.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El código de recuperación es obligatorio");
        }
        if (nuevaContrasena == null || nuevaContrasena.length() < 8 || nuevaContrasena.length() > 72) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La nueva contraseña debe tener entre 8 y 72 caracteres");
        }

        TokenRecuperacion registro = tokenRepository.findByToken(token.trim().toUpperCase(Locale.ROOT))
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "El código de recuperación es inválido o no existe"));

        LocalDateTime ahora = LocalDateTime.now(ZoneOffset.UTC);
        if (Boolean.TRUE.equals(registro.getUsado())
                || !registro.getFechaExpiracion().isAfter(ahora)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "El código de recuperación ya fue utilizado o ha expirado");
        }

        String hash = passwordEncoder.encode(nuevaContrasena);
        Usuario usuario = registro.getUsuario();
        usuario.setContrasena(hash);
        usuarioRepository.save(usuario);

        String correoLower = usuario.getCorreo().toLowerCase(Locale.ROOT);
        if (inMemoryUserDetailsManager != null && inMemoryUserDetailsManager.userExists(correoLower)) {
            UserDetails actual = inMemoryUserDetailsManager.loadUserByUsername(correoLower);
            inMemoryUserDetailsManager.updatePassword(actual, hash);
        }

        registro.setUsado(true);
        tokenRepository.save(registro);
    }

    private String generarCodigo() {
        StringBuilder sb = new StringBuilder("MYT-");
        for (int i = 0; i < 6; i++) {
            sb.append(ALFABETO.charAt(secureRandom.nextInt(ALFABETO.length())));
        }
        return sb.toString();
    }
}
