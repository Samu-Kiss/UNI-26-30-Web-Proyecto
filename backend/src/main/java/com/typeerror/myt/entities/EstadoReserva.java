package com.typeerror.myt.entities;

/** Ciclo de vida controlado de una solicitud de tutoria. */
public enum EstadoReserva {
    PENDIENTE,
    CONFIRMADA,
    RECHAZADA,
    EN_CURSO,
    COMPLETADA,
    CANCELADA
}
