FROM eclipse-temurin:21-jdk-jammy AS build

ARG SENTRY_VERSION=8.59.0

WORKDIR /workspace
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN sed -i 's/\r$//' mvnw .mvn/wrapper/maven-wrapper.properties && chmod +x mvnw \
    && ./mvnw --batch-mode --no-transfer-progress dependency:go-offline

COPY src/ src/
COPY config/ config/
COPY supabase/ supabase/
RUN ./mvnw --batch-mode --no-transfer-progress package -DskipTests \
    && ./mvnw --batch-mode --no-transfer-progress dependency:copy \
        -Dartifact=io.sentry:sentry-opentelemetry-agent:"${SENTRY_VERSION}" \
        -DoutputDirectory=/workspace/sentry-agent \
        -Dmdep.stripVersion=true

FROM eclipse-temurin:21-jre-jammy

WORKDIR /app
COPY --from=build --chown=10001:0 /workspace/target/*.jar app.jar
COPY --from=build --chown=10001:0 \
    /workspace/sentry-agent/sentry-opentelemetry-agent.jar sentry-opentelemetry-agent.jar

ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=55.0 -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:+ExitOnOutOfMemoryError" \
    SENTRY_AUTO_INIT="false"
EXPOSE 8080
USER 10001

ENTRYPOINT ["sh", "-c", "if [ -n \"$SENTRY_DSN\" ] || [ \"${SENTRY_AGENT_ENABLED:-false}\" = \"true\" ]; then exec java -javaagent:/app/sentry-opentelemetry-agent.jar -jar /app/app.jar; else exec java -jar /app/app.jar; fi"]
