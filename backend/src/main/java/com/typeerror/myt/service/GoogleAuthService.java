package com.typeerror.myt.service;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.text.ParseException;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSVerifier;
import com.nimbusds.jose.crypto.ECDSAVerifier;
import com.nimbusds.jose.crypto.RSASSAVerifier;
import com.nimbusds.jose.jwk.ECKey;
import com.nimbusds.jose.jwk.JWK;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.typeerror.myt.entities.Estudiante;
import com.typeerror.myt.entities.RolUsuario;
import com.typeerror.myt.entities.Usuario;
import com.typeerror.myt.repository.EstudianteRepository;
import com.typeerror.myt.repository.UsuarioRepository;

@Service
@Transactional
public class GoogleAuthService {

    private static final String DEFAULT_SUPABASE_PROJECT_REF = "rrxvxcufuwmjbqiwhgmt";
    private static final String DEFAULT_REDIRECT_TO = "http://localhost:4200/login";
    private static final String APELLIDO_GOOGLE_DEFAULT = "Google";

    private final UsuarioRepository usuarioRepository;
    private final EstudianteRepository estudianteRepository;
    private final LoginService loginService;
    private final PasswordEncoder passwordEncoder;
    private final boolean demoEnabled;
    private final String supabaseUrl;
    private final String supabaseAnonKey;
    private final HttpClient httpClient;
    private volatile JWKSet cachedJwkSet;

    public GoogleAuthService(
            UsuarioRepository usuarioRepository,
            EstudianteRepository estudianteRepository,
            LoginService loginService,
            PasswordEncoder passwordEncoder,
            boolean demoEnabled) {
        this(usuarioRepository, estudianteRepository, loginService, passwordEncoder,
                demoEnabled, "", "", "");
    }

    @Autowired
    public GoogleAuthService(
            UsuarioRepository usuarioRepository,
            EstudianteRepository estudianteRepository,
            LoginService loginService,
            PasswordEncoder passwordEncoder,
            @Value("${myt.google.demo-enabled:false}") boolean demoEnabled,
            @Value("${myt.supabase.url:}") String configuredSupabaseUrl,
            @Value("${myt.supabase.anon-key:}") String supabaseAnonKey,
            @Value("${spring.datasource.username:}") String datasourceUsername) {
        this.usuarioRepository = usuarioRepository;
        this.estudianteRepository = estudianteRepository;
        this.loginService = loginService;
        this.passwordEncoder = passwordEncoder;
        this.demoEnabled = demoEnabled;
        this.supabaseUrl = determinarSupabaseUrl(configuredSupabaseUrl, datasourceUsername);
        this.supabaseAnonKey = supabaseAnonKey != null ? supabaseAnonKey.trim() : "";
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }

    void establecerJwkSet(JWKSet jwkSet) {
        this.cachedJwkSet = jwkSet;
    }

    static String determinarSupabaseUrl(String configuredSupabaseUrl, String datasourceUsername) {
        if (configuredSupabaseUrl != null && !configuredSupabaseUrl.isBlank()) {
            return quitarBarrasFinales(configuredSupabaseUrl.trim());
        }
        if (datasourceUsername != null && datasourceUsername.startsWith("postgres.")) {
            String ref = datasourceUsername.substring("postgres.".length()).trim();
            if (!ref.isEmpty()) {
                return "https://" + ref + ".supabase.co";
            }
        }
        return "https://" + DEFAULT_SUPABASE_PROJECT_REF + ".supabase.co";
    }

    private static String quitarBarrasFinales(String valor) {
        int fin = valor.length();
        while (fin > 0 && valor.charAt(fin - 1) == '/') {
            fin--;
        }
        return valor.substring(0, fin);
    }

    public String resolverSupabaseUrl() {
        return supabaseUrl;
    }

    public String construirUrlAutorizacionGoogle(String redirectTo) {
        String destino = (redirectTo != null && !redirectTo.isBlank())
                ? redirectTo.trim()
                : DEFAULT_REDIRECT_TO;
        return supabaseUrl + "/auth/v1/authorize?provider=google&redirect_to="
                + URLEncoder.encode(destino, StandardCharsets.UTF_8);
    }

    public List<UsuarioAutenticado> autenticarConGoogle(
            String correo,
            String nombreCompleto,
            String credencialJwt) {
        String correoResuelto = null;
        String nombreResuelto = nombreCompleto;

        if (credencialJwt != null && !credencialJwt.isBlank()) {
            IdentidadGoogle identidad = verificarTokenSupabaseOGoogle(
                    credencialJwt.trim(), nombreResuelto);
            correoResuelto = identidad.correo();
            nombreResuelto = identidad.nombre();
        } else if (demoEnabled) {
            correoResuelto = correo;
        } else {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Se requiere credencial de Google OAuth emitida por Supabase");
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
            usuario = sincronizarNombreUsuario(usuario, nombreResuelto, correoLimpio);
            var perfiles = loginService.resolverPerfiles(usuario);
            if (!perfiles.isEmpty()) {
                return perfiles;
            }
            if (!usuario.getRoles().contains(RolUsuario.ESTUDIANTE)) {
                usuario.getRoles().add(RolUsuario.ESTUDIANTE);
                usuario = usuarioRepository.save(usuario);
            }
            Estudiante estudiante = estudianteRepository.save(new Estudiante(
                    null,
                    usuario,
                    "GOOGLE-" + usuario.getId(),
                    "Pontificia Universidad Javeriana",
                    "Estudiante autenticado con Google",
                    1));
            return List.of(new UsuarioAutenticado(RolUsuario.ESTUDIANTE, estudiante.getId()));
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

    private IdentidadGoogle verificarTokenSupabaseOGoogle(String token, String nombreFallback) {
        if (!supabaseAnonKey.isEmpty()) {
            IdentidadGoogle verificadaRemota = consultarUsuarioSupabase(token, nombreFallback);
            if (verificadaRemota != null) {
                return verificadaRemota;
            }
        }
        return extraerIdentidadJwt(token, nombreFallback);
    }

    private IdentidadGoogle consultarUsuarioSupabase(String token, String nombreFallback) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(supabaseUrl + "/auth/v1/user"))
                    .timeout(Duration.ofSeconds(5))
                    .header("Authorization", "Bearer " + token)
                    .header("apikey", supabaseAnonKey)
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(
                    request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() == 200) {
                JWTClaimsSet claims = JWTClaimsSet.parse(response.body());
                return construirIdentidadDesdeClaims(claims, nombreFallback);
            }
            if (response.statusCode() == 401 || response.statusCode() == 403) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "Token de Supabase Google OAuth inválido o expirado");
            }
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
        } catch (IOException | ParseException | IllegalArgumentException ignored) {
            // Se intenta verificación local como respaldo
        }
        return null;
    }

    private IdentidadGoogle extraerIdentidadJwt(String jwt, String nombreFallback) {
        String[] partes = jwt.split("\\.");
        if (partes.length != 3 || partes[0].isBlank() || partes[1].isBlank() || partes[2].isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Credencial de Google no válida");
        }
        try {
            Base64.getUrlDecoder().decode(partes[0]);
            String payload = new String(
                    Base64.getUrlDecoder().decode(partes[1]),
                    StandardCharsets.UTF_8);
            JWTClaimsSet claims = JWTClaimsSet.parse(payload);
            Object expClaim = claims.toJSONObject().get("exp");
            if (expClaim instanceof Number expSeconds
                    && Instant.ofEpochSecond(expSeconds.longValue()).isBefore(Instant.now())) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "El token de Google ha expirado");
            }
            String issuer = claims.getIssuer();
            if (issuer != null && !issuer.isBlank() && !esEmisorValido(issuer)) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "Emisor del token OAuth no autorizado");
            }
            SignedJWT signedJwt = SignedJWT.parse(jwt);
            String kid = signedJwt.getHeader().getKeyID();
            if (kid != null && !kid.isBlank()) {
                verificarFirmaJwks(signedJwt, kid);
            }
            return construirIdentidadDesdeClaims(claims, nombreFallback);
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (IllegalArgumentException | ParseException | JOSEException ignored) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Token de Google inválido");
        }
    }

    private boolean esEmisorValido(String issuer) {
        String limpio = quitarBarrasFinales(issuer.trim());
        return limpio.equalsIgnoreCase(supabaseUrl + "/auth/v1")
                || limpio.equalsIgnoreCase("https://accounts.google.com")
                || limpio.equalsIgnoreCase("accounts.google.com");
    }

    private void verificarFirmaJwks(SignedJWT signedJwt, String kid) throws JOSEException {
        JWK jwk = buscarJwk(kid);
        if (jwk == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Clave de firma JWK no reconocida para el token OAuth");
        }
        JWSVerifier verifier;
        if (jwk instanceof ECKey ecKey) {
            verifier = new ECDSAVerifier(ecKey.toECPublicKey());
        } else if (jwk instanceof RSAKey rsaKey) {
            verifier = new RSASSAVerifier(rsaKey.toRSAPublicKey());
        } else {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Algoritmo de firma JWK no soportado");
        }
        if (!signedJwt.verify(verifier)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Firma criptográfica del token OAuth inválida");
        }
    }

    private JWK buscarJwk(String kid) {
        JWKSet actual = cachedJwkSet;
        if (actual != null) {
            JWK encontrada = actual.getKeyByKeyId(kid);
            if (encontrada != null) {
                return encontrada;
            }
        }
        JWKSet descargado = cargarJwksRemoto();
        if (descargado != null) {
            cachedJwkSet = descargado;
            return descargado.getKeyByKeyId(kid);
        }
        return null;
    }

    private JWKSet cargarJwksRemoto() {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(supabaseUrl + "/auth/v1/.well-known/jwks.json"))
                    .timeout(Duration.ofSeconds(5))
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(
                    request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() == 200 && response.body() != null) {
                return JWKSet.parse(response.body());
            }
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
        } catch (IOException | ParseException | IllegalArgumentException ignored) {
            // Se retorna null si no es posible obtener el JWKSet remoto
        }
        return null;
    }

    private IdentidadGoogle construirIdentidadDesdeClaims(
            JWTClaimsSet claims, String nombreFallback) throws ParseException {
        Map<String, Object> userMetadata = claims.getJSONObjectClaim("user_metadata");
        if (userMetadata == null) {
            userMetadata = claims.getJSONObjectClaim("raw_user_meta_data");
        }
        String correo = claims.getStringClaim("email");
        if ((correo == null || correo.isBlank()) && userMetadata != null
                && userMetadata.get("email") instanceof String metaEmail) {
            correo = metaEmail;
        }
        if (correo == null || correo.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Token de Google sin correo verificado");
        }

        String nombre = nombreFallback;
        if (nombre == null || nombre.isBlank()) {
            nombre = extraerNombreDeClaims(claims, userMetadata);
        }
        return new IdentidadGoogle(correo, nombre);
    }

    private String extraerNombreDeClaims(
            JWTClaimsSet claims, Map<String, Object> userMetadata) throws ParseException {
        String desdeMetadata = extraerNombreDeMetadata(userMetadata);
        if (desdeMetadata != null) {
            return desdeMetadata;
        }
        String claimFullName = claims.getStringClaim("full_name");
        if (claimFullName != null && !claimFullName.isBlank()) {
            return claimFullName;
        }
        String claimName = claims.getStringClaim("name");
        return (claimName != null && !claimName.isBlank()) ? claimName : null;
    }

    private String extraerNombreDeMetadata(Map<String, Object> userMetadata) {
        if (userMetadata == null) {
            return null;
        }
        if (userMetadata.get("full_name") instanceof String fullName && !fullName.isBlank()) {
            return fullName;
        }
        if (userMetadata.get("name") instanceof String metaName && !metaName.isBlank()) {
            return metaName;
        }
        String given = userMetadata.get("given_name") instanceof String g ? g.trim() : "";
        String family = userMetadata.get("family_name") instanceof String f ? f.trim() : "";
        String combinado = (given + " " + family).trim();
        return combinado.isEmpty() ? null : combinado;
    }

    private Usuario sincronizarNombreUsuario(
            Usuario usuario, String nombreResuelto, String correoLimpio) {
        boolean tieneNombreVerificado = nombreResuelto != null && !nombreResuelto.isBlank();
        boolean tieneNombrePlaceholder = "Camila".equalsIgnoreCase(usuario.getNombre())
                && APELLIDO_GOOGLE_DEFAULT.equalsIgnoreCase(usuario.getApellido());
        if (!tieneNombreVerificado && !tieneNombrePlaceholder) {
            return usuario;
        }
        String[] partesNombre = separarNombre(nombreResuelto, correoLimpio);
        if (!Objects.equals(usuario.getNombre(), partesNombre[0])
                || !Objects.equals(usuario.getApellido(), partesNombre[1])) {
            usuario.setNombre(partesNombre[0]);
            usuario.setApellido(partesNombre[1]);
            Usuario guardado = usuarioRepository.save(usuario);
            return guardado != null ? guardado : usuario;
        }
        return usuario;
    }

    private String[] separarNombre(String nombreCompleto, String correo) {
        if (nombreCompleto != null && !nombreCompleto.isBlank()) {
            String[] partes = nombreCompleto.trim().split("\\s+", 2);
            if (partes.length == 2) {
                return new String[] {partes[0], partes[1]};
            }
            return new String[] {partes[0], APELLIDO_GOOGLE_DEFAULT};
        }
        String alias = correo.substring(0, correo.indexOf('@'))
                .replace('.', ' ')
                .replace('_', ' ')
                .replace('-', ' ')
                .trim();
        if (!alias.isEmpty()) {
            String[] partesAlias = alias.split("\\s+", 2);
            String nombreAlias = capitalizarPalabras(partesAlias[0]);
            if (partesAlias.length == 2 && !partesAlias[1].isBlank()) {
                return new String[] {nombreAlias, capitalizarPalabras(partesAlias[1])};
            }
            return new String[] {nombreAlias, APELLIDO_GOOGLE_DEFAULT};
        }
        return new String[] {"Usuario", APELLIDO_GOOGLE_DEFAULT};
    }

    private String capitalizarPalabras(String texto) {
        String[] palabras = texto.trim().split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String palabra : palabras) {
            if (palabra.isEmpty()) {
                continue;
            }
            if (!sb.isEmpty()) {
                sb.append(' ');
            }
            sb.append(Character.toUpperCase(palabra.charAt(0)))
                    .append(palabra.substring(1).toLowerCase(Locale.ROOT));
        }
        return sb.toString();
    }

    private record IdentidadGoogle(String correo, String nombre) { }
}
