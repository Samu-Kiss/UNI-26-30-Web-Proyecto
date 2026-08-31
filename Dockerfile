FROM eclipse-temurin:25-jdk-jammy AS build

ARG SENTRY_VERSION=8.54.0

WORKDIR /workspace
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw --batch-mode --no-transfer-progress dependency:go-offline

COPY src/ src/
COPY config/ config/
RUN ./mvnw --batch-mode --no-transfer-progress package -DskipTests \
    && ./mvnw --batch-mode --no-transfer-progress dependency:copy \
        -Dartifact=io.sentry:sentry-opentelemetry-agent:${SENTRY_VERSION} \
        -DoutputDirectory=/workspace/sentry-agent \
        -Dmdep.stripVersion=true

FROM eclipse-temurin:25-jre-jammy

WORKDIR /app
COPY --from=build --chown=10001:0 /workspace/target/*.jar app.jar
COPY --from=build --chown=10001:0 \
    /workspace/sentry-agent/sentry-opentelemetry-agent.jar sentry-opentelemetry-agent.jar

ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75.0" \
    SENTRY_AUTO_INIT="false"
EXPOSE 8080
USER 10001

ENTRYPOINT ["java", "-javaagent:/app/sentry-opentelemetry-agent.jar", "-jar", "/app/app.jar"]
