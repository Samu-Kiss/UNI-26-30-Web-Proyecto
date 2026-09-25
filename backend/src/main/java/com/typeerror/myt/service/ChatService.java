package com.typeerror.myt.service;

import java.util.List;

import com.typeerror.myt.entities.Conversacion;
import com.typeerror.myt.entities.Mensaje;

public interface ChatService {
    Conversacion obtenerOCrearConversacion(Integer reservaId, Integer usuarioId);

    List<Mensaje> listarMensajes(Integer conversacionId, Integer usuarioId);

    Mensaje enviarMensaje(Integer conversacionId, Integer remitenteId, String contenido);

    Mensaje editarMensaje(Long mensajeId, Integer remitenteId, String contenido);

    Mensaje eliminarMensaje(Long mensajeId, Integer remitenteId);

    Mensaje marcarComoLeido(Long mensajeId, Integer lectorId);

    Conversacion cerrarConversacion(Integer conversacionId, Integer usuarioId);
}
