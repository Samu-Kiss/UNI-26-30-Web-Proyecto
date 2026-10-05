package com.typeerror.myt.service;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.stereotype.Service;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Service
public class JwtSesionService {

    public static final String COOKIE = "myt_sesion";
    private final NimbusJwtEncoder encoder;
    private final NimbusJwtDecoder decoder;
    private final Duration duracion;
    private final boolean secure;

    public JwtSesionService(@Value("${myt.jwt.secret}") String secret,
            @Value("${myt.jwt.duration:PT8H}") Duration duracion,
            @Value("${myt.jwt.cookie-secure:true}") boolean secure) {
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32 || duracion.isNegative() || duracion.isZero()) {
            throw new IllegalArgumentException("JWT requiere una clave de al menos 32 bytes y duración positiva");
        }
        var key = new SecretKeySpec(bytes, "HmacSHA256");
        encoder = NimbusJwtEncoder.withSecretKey(key).build();
        decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer("myt"));
        this.duracion = duracion;
        this.secure = secure;
    }

    public String emitir(List<String> perfiles, boolean seleccion) {
        Instant ahora = Instant.now();
        var claims = JwtClaimsSet.builder().issuer("myt").issuedAt(ahora)
                .expiresAt(ahora.plus(seleccion ? Duration.ofMinutes(5) : duracion))
                .subject(perfiles.getFirst()).claim("perfiles", perfiles)
                .claim("seleccion", seleccion).build();
        return encoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
    }

    public List<String> perfiles(HttpServletRequest request, boolean seleccion) {
        if (request.getCookies() == null) {
            return List.of();
        }
        Optional<String> token = Arrays.stream(request.getCookies())
                .filter(cookie -> COOKIE.equals(cookie.getName())).map(cookie -> cookie.getValue()).findFirst();
        try {
            if (token.isEmpty()) {
                return List.of();
            }
            var jwt = decoder.decode(token.get());
            if (!Boolean.valueOf(seleccion).equals(jwt.getClaim("seleccion"))
                    || jwt.getExpiresAt() == null || !jwt.getExpiresAt().isAfter(Instant.now())) {
                return List.of();
            }
            List<String> perfiles = jwt.getClaimAsStringList("perfiles");
            return perfiles == null ? List.of() : perfiles;
        } catch (JwtException | IllegalArgumentException exception) {
            return List.of();
        }
    }

    public void guardar(HttpServletResponse response, List<String> perfiles, boolean seleccion) {
        cookie(response, emitir(perfiles, seleccion), seleccion ? Duration.ofMinutes(5) : duracion);
    }

    public void cerrar(HttpServletResponse response) {
        cookie(response, "", Duration.ZERO);
    }

    private void cookie(HttpServletResponse response, String valor, Duration edad) {
        response.addHeader(HttpHeaders.SET_COOKIE, ResponseCookie.from(COOKIE, valor)
                .httpOnly(true).secure(secure).sameSite("Strict").path("/").maxAge(edad).build().toString());
    }
}
