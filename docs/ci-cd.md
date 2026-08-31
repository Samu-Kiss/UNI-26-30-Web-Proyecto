# CI/CD, calidad y observabilidad

## Que valida el pipeline

El workflow `.github/workflows/ci-cd.yml` se ejecuta en pull requests y pushes a `main` o
`develop`, y tambien se puede lanzar manualmente.

- Backend: Checkstyle, pruebas, empaquetado y reporte JaCoCo mediante `./mvnw verify`.
- SonarQube o SonarCloud: analisis y espera del Quality Gate cuando esta configurado.
- Frontend: se activa automaticamente al detectar Angular en `/frontend` o en la raiz.
- CD: tras un push valido a `main` o un tag `v*`, publica una imagen en GHCR.
- Dependabot: revisa Maven, GitHub Actions y la imagen base de Docker semanalmente; agrupa los
  cambios compatibles para evitar ruido.

El CD termina en un artefacto desplegable (la imagen de contenedor). Cuando exista un proveedor
de hosting se debe agregar un job posterior que promueva exactamente esa imagen; no se reconstruye
el codigo durante el despliegue.

## Configurar Sonar

Crear un proyecto en SonarCloud o en una instancia de SonarQube y definir en GitHub:

| Tipo | Nombre | Obligatorio | Uso |
| --- | --- | --- | --- |
| Secret | `SONAR_TOKEN` | Si | Token de analisis |
| Variable | `SONAR_PROJECT_KEY` | Si | Clave unica del proyecto |
| Variable | `SONAR_HOST_URL` | No | URL de SonarQube; por defecto `https://sonarcloud.io` |
| Variable | `SONAR_ORGANIZATION` | Solo SonarCloud | Organizacion de SonarCloud |

Sin token o clave, el job informa que omitio Sonar y el resto del CI continua. Una vez configurado,
el Quality Gate si bloquea el pipeline. Como baseline se recomienda el perfil **Sonar way** y medir
solo *New Code*: cero vulnerabilidades y bugs nuevos, deuda de duplicacion controlada y cobertura
objetivo de 70 %. Elevarla a 80 % cuando haya una suite de pruebas real evita castigar el codigo
prototipo actual.

## Configurar Sentry

El backend ya usa el starter oficial para Spring Boot 4. Configurar estas variables en el entorno
donde se ejecute el contenedor:

| Variable | Valor recomendado |
| --- | --- |
| `SENTRY_DSN` | DSN del proyecto backend |
| `SENTRY_ENVIRONMENT` | `staging` o `production` |
| `SENTRY_RELEASE` | `myt@<tag-o-sha>` |
| `SENTRY_TRACES_SAMPLE_RATE` | `0.1` para iniciar en produccion |

Sin `SENTRY_DSN`, el SDK queda inactivo. No se envia PII por defecto y el muestreo local es cero.
La imagen incluye el agente OpenTelemetry de Sentry y lo inicia automaticamente junto con la
aplicacion. `SENTRY_AUTO_INIT=false` evita una segunda inicializacion: Spring Boot mantiene el
control de la configuracion del SDK.

Para mostrar el codigo fuente junto a los stack traces, crear un **Organization Auth Token** en
Sentry y guardarlo en GitHub como el secret `SENTRY_AUTH_TOKEN`. El token nunca debe almacenarse
en `.env`, el `pom.xml` ni la imagen. En pushes a `main` y tags `v*`, CI activa el perfil Maven
`sentry-source-context` y sube el source bundle a la organizacion
`pontificia-universidad-jave-j7`, proyecto `myt-back`. Los PR no reciben el token ni realizan
subidas.

Cuando se agregue Angular:

1. Crear el workspace en `/frontend` (preferido) o en la raiz y confirmar `package-lock.json`.
2. Instalar Angular ESLint y `@sentry/angular`; mantener scripts npm llamados `lint`, `test:ci`,
   `build` y `sentry:sourcemaps`.
3. Habilitar source maps ocultos en el build de produccion. El script `sentry:sourcemaps` debe
   subirlos y eliminarlos del artefacto publico despues de la subida.
4. Configurar `SENTRY_AUTH_TOKEN` como secret y `SENTRY_ORG` y `SENTRY_FRONTEND_PROJECT` como
   variables de GitHub. El pipeline solo sube source maps en pushes a `main`.

El DSN del navegador no es secreto, pero el token de autenticacion de Sentry si lo es y nunca debe
quedar incluido en el bundle.

## Proteccion de ramas

En la regla de proteccion de `main`, requerir el check `Backend / quality` y, desde que exista
Angular, `Frontend / Angular-ready`. Requerir al menos una revision y bloquear pushes directos.
Sonar no necesita otro check: el analisis espera y falla dentro del job del backend.

## Comandos utiles

```bash
# Solo es necesario si el checkout no preservo el permiso ejecutable.
chmod +x mvnw

# Mismo control que CI
./mvnw verify

# Solo el linter
./mvnw checkstyle:check

# Imagen local (Sentry sigue desactivado sin DSN)
docker build -t myt:local .
docker run --rm -p 8080:8080 myt:local
```
