package com.typeerror.myt.config;

import org.springdoc.core.customizers.OperationCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.bind.annotation.RequestMapping;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.media.StringSchema;
import io.swagger.v3.oas.models.parameters.Parameter;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI mytOpenApi() {
        return new OpenAPI().info(new Info().title("API de MyT").version("1.0")
                .description("API de tutorías. Inicia sesión mediante POST /api/sesion/login; "
                        + "el navegador conserva la cookie HttpOnly. Si hay varios perfiles, "
                        + "selecciona uno mediante POST /api/sesion/perfil. "
                        + "Las operaciones de usuarios requieren perfil ADMINISTRADOR. "
                        + "Utiliza únicamente datos de prueba durante el laboratorio."));
    }

    @Bean
    public OperationCustomizer proteccionCsrfOpenApi() {
        return (operation, handler) -> {
            if (modificaDatos(handler)) {
                operation.addParametersItem(new Parameter().name("X-MYT-Request").in("header")
                        .required(true).description("Protección CSRF existente de la API; usar el valor 1.")
                        .schema(new StringSchema()._default("1").addEnumItem("1")));
            }
            return operation;
        };
    }

    private boolean modificaDatos(HandlerMethod handler) {
        RequestMapping mapping = org.springframework.core.annotation.AnnotatedElementUtils
                .findMergedAnnotation(handler.getMethod(), RequestMapping.class);
        return mapping != null && java.util.Arrays.stream(mapping.method())
                .anyMatch(method -> method != RequestMethod.GET && method != RequestMethod.HEAD
                        && method != RequestMethod.OPTIONS);
    }
}
