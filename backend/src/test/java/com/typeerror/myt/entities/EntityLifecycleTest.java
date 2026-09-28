package com.typeerror.myt.entities;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.Set;

import org.junit.jupiter.api.Test;

class EntityLifecycleTest {

    @Test
    void inicializaAuditoriaDelUsuario() {
        Usuario usuario = usuario(RolUsuario.ESTUDIANTE);
        usuario.setActivo(null);

        usuario.prepararCreacion();
        LocalDateTime creacion = usuario.getFechaCreacion();
        usuario.prepararActualizacion();

        assertTrue(usuario.getActivo());
        assertNotNull(creacion);
        assertNotNull(usuario.getFechaActualizacion());
    }

    @Test
    void exigeRolesCompatiblesConLosPerfiles() {
        Usuario estudianteUsuario = usuario(RolUsuario.ESTUDIANTE);
        Estudiante estudiante = new Estudiante(null, estudianteUsuario, "E-1",
                "Universidad", "Programa", 1);
        estudiante.validarRol();

        Usuario tutorUsuario = usuario(RolUsuario.TUTOR);
        Tutor tutor = new Tutor(null, tutorUsuario, null, Set.of(), BigDecimal.ONE, null);
        tutor.asegurarDisponibilidadInicial();
        assertTrue(tutor.getDisponible());

        estudiante.setUsuario(tutorUsuario);
        assertThrows(IllegalStateException.class, estudiante::validarRol);
        tutor.setUsuario(estudianteUsuario);
        assertThrows(IllegalStateException.class, tutor::asegurarDisponibilidadInicial);
    }

    @Test
    void inicializaReservaYCalculaSuFin() {
        Reserva reserva = new Reserva();
        reserva.setHoraInicio(LocalTime.of(10, 0));
        reserva.setDuracionMinutos(90);

        reserva.prepararCreacion();
        LocalDateTime creacion = reserva.getFechaCreacion();
        reserva.prepararActualizacion();

        assertEquals(EstadoReserva.PENDIENTE, reserva.getEstado());
        assertEquals(LocalTime.of(11, 30), reserva.calcularHoraFin());
        assertNotNull(creacion);
        assertNotNull(reserva.getFechaActualizacion());
        reserva.setHoraInicio(null);
        assertNull(reserva.calcularHoraFin());
    }

    @Test
    void inicializaResenaConversacionYMensaje() {
        Reserva reserva = new Reserva();
        Resena resena = new Resena(null, reserva, 5, null, null);
        resena.establecerFecha();
        assertNotNull(resena.getFechaCreacion());

        Conversacion conversacion = new Conversacion(reserva);
        conversacion.prepararCreacion();
        assertNotNull(conversacion.getFechaCreacion());
        assertEquals(EstadoConversacion.ACTIVA, conversacion.getEstado());

        Mensaje mensaje = new Mensaje(conversacion, usuario(RolUsuario.TUTOR), "Hola");
        mensaje.prepararEnvio();
        assertNotNull(mensaje.getFechaEnvio());
        assertFalse(mensaje.estaEliminado());
        mensaje.setFechaEliminacion(LocalDateTime.now(ZoneOffset.UTC));
        assertTrue(mensaje.estaEliminado());
    }

    @Test
    void reconoceIntervalosDeDisponibilidadInvalidos() {
        DisponibilidadTutor disponibilidad = new DisponibilidadTutor();
        disponibilidad.setHoraInicio(LocalTime.of(10, 0));
        disponibilidad.setHoraFin(LocalTime.of(9, 0));
        assertFalse(disponibilidad.tieneHorarioValido());
        disponibilidad.setHoraFin(LocalTime.of(11, 0));
        assertTrue(disponibilidad.tieneHorarioValido());
    }

    private Usuario usuario(RolUsuario rol) {
        Usuario usuario = new Usuario();
        usuario.setRoles(Set.of(rol));
        return usuario;
    }
}
