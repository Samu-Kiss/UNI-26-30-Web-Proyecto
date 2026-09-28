package com.typeerror.myt.service;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

import com.typeerror.myt.errors.ConversacionNoExisteException;
import com.typeerror.myt.errors.InformacionNoValidaException;
import com.typeerror.myt.errors.MensajeNoExisteException;
import com.typeerror.myt.errors.ReservaNotFoundException;
import com.typeerror.myt.errors.UsuarioNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.typeerror.myt.entities.Conversacion;
import com.typeerror.myt.entities.EstadoConversacion;
import com.typeerror.myt.entities.Mensaje;
import com.typeerror.myt.entities.Reserva;
import com.typeerror.myt.entities.Usuario;
import com.typeerror.myt.repository.ConversacionRepository;
import com.typeerror.myt.repository.MensajeRepository;
import com.typeerror.myt.repository.ReservaRepository;
import com.typeerror.myt.repository.UsuarioRepository;

@Service
public class ChatServiceImpl implements ChatService {

    private final ConversacionRepository conversacionRepository;
    private final MensajeRepository mensajeRepository;
    private final ReservaRepository reservaRepository;
    private final UsuarioRepository usuarioRepository;

    public ChatServiceImpl(ConversacionRepository conversacionRepository,
            MensajeRepository mensajeRepository, ReservaRepository reservaRepository,
            UsuarioRepository usuarioRepository) {
        this.conversacionRepository = conversacionRepository;
        this.mensajeRepository = mensajeRepository;
        this.reservaRepository = reservaRepository;
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    @Transactional
    public Conversacion obtenerOCrearConversacion(Integer reservaId, Integer usuarioId) {
        return conversacionRepository.findByReservaId(reservaId)
                .map(conversacion -> {
                    validarParticipante(conversacion, usuarioId);
                    return conversacion;
                })
                .orElseGet(() -> crearConversacion(reservaId, usuarioId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<Mensaje> listarMensajes(Integer conversacionId, Integer usuarioId) {
        Conversacion conversacion = obtenerConversacion(conversacionId);
        validarParticipante(conversacion, usuarioId);
        return mensajeRepository.findByConversacionIdOrderByFechaEnvioAsc(conversacionId);
    }

    @Override
    @Transactional
    public Mensaje enviarMensaje(Integer conversacionId, Integer remitenteId, String contenido) {
        Conversacion conversacion = obtenerConversacion(conversacionId);
        validarParticipante(conversacion, remitenteId);
        validarActiva(conversacion);
        validarContenido(contenido);
        Usuario remitente = usuarioRepository.findById(remitenteId)
                .orElseThrow(() -> new UsuarioNotFoundException(remitenteId));
        boolean activo = Boolean.TRUE.equals(remitente.getActivo());
        if (!activo) {
            throw new IllegalStateException("Un usuario inactivo no puede enviar mensajes");
        }
        return mensajeRepository.save(new Mensaje(conversacion, remitente, contenido.trim()));
    }

    @Override
    @Transactional
    public Mensaje editarMensaje(Long mensajeId, Integer remitenteId, String contenido) {
        Mensaje mensaje = obtenerMensaje(mensajeId);
        validarAutor(mensaje, remitenteId);
        validarActiva(mensaje.getConversacion());
        validarContenido(contenido);
        if (mensaje.estaEliminado()) {
            throw new IllegalStateException("No se puede editar un mensaje eliminado");
        }
        mensaje.setContenido(contenido.trim());
        mensaje.setFechaEdicion(LocalDateTime.now(ZoneOffset.UTC));
        return mensajeRepository.save(mensaje);
    }

    @Override
    @Transactional
    public Mensaje eliminarMensaje(Long mensajeId, Integer remitenteId) {
        Mensaje mensaje = obtenerMensaje(mensajeId);
        validarAutor(mensaje, remitenteId);
        if (!mensaje.estaEliminado()) {
            mensaje.setFechaEliminacion(LocalDateTime.now(ZoneOffset.UTC));
        }
        return mensajeRepository.save(mensaje);
    }

    @Override
    @Transactional
    public Mensaje marcarComoLeido(Long mensajeId, Integer lectorId) {
        Mensaje mensaje = obtenerMensaje(mensajeId);
        validarParticipante(mensaje.getConversacion(), lectorId);
        if (mensaje.getRemitente().getId().equals(lectorId)) {
            throw new IllegalArgumentException("El remitente no marca su propio mensaje como leido");
        }
        if (!mensaje.estaEliminado() && mensaje.getLeidoEn() == null) {
            mensaje.setLeidoEn(LocalDateTime.now(ZoneOffset.UTC));
        }
        return mensajeRepository.save(mensaje);
    }

    @Override
    @Transactional
    public Conversacion cerrarConversacion(Integer conversacionId, Integer usuarioId) {
        Conversacion conversacion = obtenerConversacion(conversacionId);
        validarParticipante(conversacion, usuarioId);
        conversacion.setEstado(EstadoConversacion.CERRADA);
        return conversacionRepository.save(conversacion);
    }

    private Conversacion crearConversacion(Integer reservaId, Integer usuarioId) {
        Reserva reserva = reservaRepository.findOneById(reservaId)
                .orElseThrow(() -> new ReservaNotFoundException(reservaId));
        validarParticipante(reserva, usuarioId);
        return conversacionRepository.save(new Conversacion(reserva));
    }

    private Conversacion obtenerConversacion(Integer id) {
        return conversacionRepository.findOneById(id)
                .orElseThrow(() -> new ConversacionNoExisteException(id));
    }

    private Mensaje obtenerMensaje(Long id) {
        return mensajeRepository.findOneById(id)
                .orElseThrow(() -> new MensajeNoExisteException(id));
    }

    private void validarParticipante(Conversacion conversacion, Integer usuarioId) {
        validarParticipante(conversacion.getReserva(), usuarioId);
    }

    private void validarParticipante(Reserva reserva, Integer usuarioId) {
        Integer estudianteId = reserva.getEstudiante().getUsuario().getId();
        Integer tutorId = reserva.getTutor().getUsuario().getId();
        if (!estudianteId.equals(usuarioId) && !tutorId.equals(usuarioId)) {
            throw new SecurityException("El usuario no participa en esta conversacion");
        }
    }

    private void validarAutor(Mensaje mensaje, Integer usuarioId) {
        if (!mensaje.getRemitente().getId().equals(usuarioId)) {
            throw new SecurityException("Solo el remitente puede modificar el mensaje");
        }
    }

    private void validarActiva(Conversacion conversacion) {
        if (conversacion.getEstado() != EstadoConversacion.ACTIVA) {
            throw new IllegalStateException("La conversacion esta cerrada");
        }
    }

    private void validarContenido(String contenido) {
        if (contenido == null || contenido.isBlank() || contenido.length() > 4000) {
            throw new InformacionNoValidaException();
        }
    }
}
