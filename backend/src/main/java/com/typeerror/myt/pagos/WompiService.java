package com.typeerror.myt.pagos;

import java.net.http.HttpClient;
import java.time.Duration;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;
import tools.jackson.databind.JsonNode;

@Service
public class WompiService {
    private final String publicKey;
    private final String privateKey;
    private final String integrityKey;
    private final String eventsSecret;
    private final String frontendUrl;
    private final RestClient sandbox;

    public WompiService(@Value("${WOMPI_PUBLIC_KEY:}") String publicKey,
            @Value("${WOMPI_PRIVATE_KEY:}") String privateKey,
            @Value("${WOMPI_INTEGRITY_KEY:}") String integrityKey,
            @Value("${WOMPI_EVENTS_SECRET:}") String eventsSecret,
            @Value("${FRONTEND_URL:http://localhost:4200}") String frontendUrl) {
        this.publicKey = publicKey;
        this.privateKey = privateKey;
        this.integrityKey = integrityKey;
        this.eventsSecret = eventsSecret;
        this.frontendUrl = frontendUrl.replaceAll("/+$", "");
        var client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
        var factory = new JdkClientHttpRequestFactory(client);
        factory.setReadTimeout(Duration.ofSeconds(8));
        sandbox = RestClient.builder().baseUrl("https://sandbox.wompi.co/v1")
                .requestFactory(factory).build();
    }

    public boolean habilitado() {
        return publicKey.startsWith("pub_test_") && privateKey.startsWith("prv_test_")
                && integrityKey.startsWith("test_integrity_") && eventsSecret.startsWith("test_events_");
    }

    public String checkout(String referencia, long centavos) {
        String retorno = frontendUrl + "/pago/resultado?referencia=" + referencia;
        return UriComponentsBuilder.fromUriString("https://checkout.wompi.co/p/")
                .queryParam("public-key", publicKey).queryParam("currency", "COP")
                .queryParam("amount-in-cents", centavos).queryParam("reference", referencia)
                .queryParam("signature:integrity", sha256(referencia + centavos + "COP" + integrityKey))
                .queryParam("redirect-url", "{retorno}").encode().buildAndExpand(retorno).toUriString();
    }

    public boolean firmaValida(JsonNode evento) {
        var firma = evento.path("signature");
        var propiedades = firma.path("properties");
        var timestamp = evento.path("timestamp");
        if (!habilitado() || !propiedades.isArray() || propiedades.isEmpty()
                || !timestamp.isIntegralNumber()) {
            return false;
        }
        var datos = new StringBuilder();
        boolean idFirmado = false;
        for (var propiedad : propiedades) {
            String ruta = propiedad.asText();
            idFirmado |= "transaction.id".equals(ruta);
            var valor = evento.path("data");
            for (String segmento : ruta.split("\\.")) {
                valor = valor.path(segmento);
            }
            if (!valor.isTextual() && !valor.isNumber() && !valor.isBoolean()) {
                return false;
            }
            datos.append(valor.asText());
        }
        String esperado = sha256(datos.append(timestamp.asText()).append(eventsSecret).toString());
        return idFirmado && MessageDigest.isEqual(esperado.getBytes(StandardCharsets.US_ASCII),
                firma.path("checksum").asText().toLowerCase(java.util.Locale.ROOT)
                        .getBytes(StandardCharsets.US_ASCII));
    }

    public JsonNode consultarTransaccion(String id) {
        try {
            JsonNode respuesta = sandbox.get().uri("/transactions/{id}", id)
                    .headers(headers -> headers.setBearerAuth(privateKey))
                    .retrieve().body(JsonNode.class);
            if (respuesta != null && id.equals(respuesta.path("data").path("id").asText())) {
                return respuesta.path("data");
            }
        } catch (RestClientException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Wompi no respondió", exception);
        }
        throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Respuesta de Wompi inválida");
    }

    private static String sha256(String texto) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(texto.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }
}
