package com.typeerror.myt.api;

import java.util.Map;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;
import com.typeerror.myt.errors.EstudianteNotFoundException;
import com.typeerror.myt.errors.MateriaNotFoundException;
import com.typeerror.myt.errors.ReservaNotFoundException;
import com.typeerror.myt.errors.TutorNotFoundException;
import com.typeerror.myt.errors.UsuarioNotFoundException;
import com.typeerror.myt.errors.InformacionIncompletaException;
import com.typeerror.myt.errors.InformacionNoValidaException;
import com.typeerror.myt.errors.SelfReservation;
import com.typeerror.myt.errors.UsuarioYaExistenteException;

@Order(-1)
@RestControllerAdvice(basePackages = "com.typeerror.myt.api")
public class ApiExceptionHandler {
    private static final String MESSAGE_KEY = "mensaje";

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> status(ResponseStatusException exception) {
        return ResponseEntity.status(exception.getStatusCode())
                .body(Map.of(MESSAGE_KEY,
                        exception.getReason() == null ? "Solicitud inválida" : exception.getReason()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> validation(MethodArgumentNotValidException exception) {
        String message = exception.getBindingResult().getFieldErrors().stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .collect(java.util.stream.Collectors.joining("; "));
        return ResponseEntity.badRequest().body(Map.of(MESSAGE_KEY, message));
    }

    @ExceptionHandler({TutorNotFoundException.class, ReservaNotFoundException.class,
        MateriaNotFoundException.class, EstudianteNotFoundException.class, UsuarioNotFoundException.class})
    public ResponseEntity<Map<String, String>> missing(RuntimeException exception) {
        return ResponseEntity.status(404).body(Map.of(MESSAGE_KEY, "Registro no encontrado"));
    }

    @ExceptionHandler({DataIntegrityViolationException.class, OptimisticLockingFailureException.class,
        IllegalStateException.class, UsuarioYaExistenteException.class})
    public ResponseEntity<Map<String, String>> conflict(RuntimeException exception) {
        return ResponseEntity.status(409)
                .body(Map.of(MESSAGE_KEY, "Conflicto: revisa disponibilidad o datos duplicados"));
    }

    @ExceptionHandler({IllegalArgumentException.class, HttpMessageNotReadableException.class,
        MethodArgumentTypeMismatchException.class, InformacionIncompletaException.class,
        InformacionNoValidaException.class, SelfReservation.class,
        jakarta.validation.ConstraintViolationException.class})
    public ResponseEntity<Map<String, String>> invalid(Exception exception) {
        return ResponseEntity.badRequest().body(Map.of(MESSAGE_KEY, "Revisa los datos y el horario solicitado"));
    }
}
