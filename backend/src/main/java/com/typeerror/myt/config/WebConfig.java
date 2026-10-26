package com.typeerror.myt.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final SesionInterceptor sesionInterceptor;
    private final com.typeerror.myt.api.ApiInterceptor apiInterceptor;

    public WebConfig(SesionInterceptor sesionInterceptor,
            com.typeerror.myt.api.ApiInterceptor apiInterceptor) {
        this.sesionInterceptor = sesionInterceptor;
        this.apiInterceptor = apiInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(apiInterceptor).addPathPatterns("/api/**");
        registry.addInterceptor(sesionInterceptor)
                .addPathPatterns("/admin", "/estudiante", "/tutor", "/usuarios/**",
                        "/estudiantes/**", "/tutores/**", "/reservas", "/administradores");
    }

    @Override
    public void addCorsMappings(org.springframework.web.servlet.config.annotation.CorsRegistry registry) {
        registry.addMapping("/api/**").allowedOrigins("http://localhost:4200")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("Content-Type", "X-MYT-Request", "X-XSRF-TOKEN")
                .allowCredentials(true);
    }

}
