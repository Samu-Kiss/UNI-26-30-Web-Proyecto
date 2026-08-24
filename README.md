# MyT

Aplicacion web de tutorias construida con Spring Boot 4 y Java 21.

## Desarrollo local

```bash
# Solo es necesario si el checkout no preservo el permiso ejecutable.
chmod +x mvnw
./mvnw verify
./mvnw spring-boot:run
```

`verify` compila, ejecuta Checkstyle y las pruebas, y genera el reporte JaCoCo en
`target/site/jacoco/index.html`. Sentry no envia datos en local mientras `SENTRY_DSN` no este
definida.

La configuracion completa del pipeline, Sonar, Sentry, GHCR y la futura aplicacion Angular esta en
[docs/ci-cd.md](docs/ci-cd.md).
