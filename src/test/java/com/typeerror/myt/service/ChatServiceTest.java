package com.typeerror.myt.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.typeerror.myt.entities.Conversacion;
import com.typeerror.myt.entities.EstadoConversacion;
import com.typeerror.myt.entities.Estudiante;
import com.typeerror.myt.entities.Mensaje;
import com.typeerror.myt.entities.Reserva;
import com.typeerror.myt.entities.Tutor;
import com.typeerror.myt.entities.Usuario;
import com.typeerror.myt.repository.ConversacionRepository;
import com.typeerror.myt.repository.MensajeRepository;
import com.typeerror.myt.repository.ReservaRepository;
import com.typeerror.myt.repository.UsuarioRepository;

@ExtendWith(MockitoExtension.class)
class ChatServiceTest {

    @Mock
    private ConversacionRepository conversacionRepository;
    @Mock
    private MensajeRepository mensajeRepository;
    @Mock
    private ReservaRepository reservaRepository;
    @Mock
    private UsuarioRepository usuarioRepository;

    private ChatService chatService;
    private Conversacion conversacion;
    private Usuario estudianteUsuario;
    private Usuario tutorUsuario;

    @BeforeEach
    void preparar() {
        chatService = new ChatServiceImpl(conversacionRepository, mensajeRepository,
                reservaRepository, usuarioRepository);
        estudianteUsuario = usuario(1);
        tutorUsuario = usuario(2);
        Estudiante estudiante = new Estudiante();
        estudiante.setUsuario(estudianteUsuario);
        Tutor tutor = new Tutor();
        tutor.setUsuario(tutorUsuario);
        Reserva reserva = new Reserva();
        reserva.setId(10);
        reserva.setEstudiante(estudiante);
        reserva.setTutor(tutor);
        conversacion = new Conversacion(reserva);
        conversacion.setId(20);
    }

    @Test
    void permiteEnviarSoloAUnParticipanteActivo() {
        when(conversacionRepository.findOneById(20)).thenReturn(Optional.of(conversacion));
        when(usuarioRepository.findById(1)).thenReturn(Optional.of(estudianteUsuario));
        when(mensajeRepository.save(any(Mensaje.class))).thenAnswer(invocacion -> invocacion.getArgument(0));

        Mensaje mensaje = chatService.enviarMensaje(20, 1, "  Hola  ");

        assertEquals("Hola", mensaje.getContenido());
        assertEquals(estudianteUsuario, mensaje.getRemitente());
        verify(mensajeRepository).save(mensaje);
    }

    @Test
    void rechazaAQuienNoParticipaEnLaReserva() {
        when(conversacionRepository.findOneById(20)).thenReturn(Optional.of(conversacion));

        assertThrows(SecurityException.class,
                () -> chatService.enviarMensaje(20, 99, "Mensaje ajeno"));
    }

    @Test
    void soloElDestinatarioPuedeMarcarComoLeido() {
        Mensaje mensaje = new Mensaje(conversacion, estudianteUsuario, "Hola");
        mensaje.setId(30L);
        when(mensajeRepository.findOneById(30L)).thenReturn(Optional.of(mensaje));
        Integer remitenteId = estudianteUsuario.getId();

        assertThrows(IllegalArgumentException.class,
                () -> chatService.marcarComoLeido(30L, remitenteId));
    }

    @Test
    void creaUnaConversacionSoloParaParticipantes() {
        when(conversacionRepository.findByReservaId(10)).thenReturn(Optional.empty());
        when(reservaRepository.findOneById(10)).thenReturn(Optional.of(conversacion.getReserva()));
        when(conversacionRepository.save(any(Conversacion.class)))
                .thenAnswer(invocacion -> invocacion.getArgument(0));

        Conversacion creada = chatService.obtenerOCrearConversacion(10, tutorUsuario.getId());

        assertEquals(conversacion.getReserva(), creada.getReserva());
        assertEquals(EstadoConversacion.ACTIVA, creada.getEstado());
    }

    @Test
    void listaEditaEliminaLeeYCierraMensajes() {
        Mensaje mensaje = new Mensaje(conversacion, estudianteUsuario, "Inicial");
        mensaje.setId(30L);
        when(conversacionRepository.findOneById(20)).thenReturn(Optional.of(conversacion));
        when(mensajeRepository.findByConversacionIdOrderByFechaEnvioAsc(20))
                .thenReturn(List.of(mensaje));
        when(mensajeRepository.findOneById(30L)).thenReturn(Optional.of(mensaje));
        when(mensajeRepository.save(any(Mensaje.class))).thenAnswer(invocacion -> invocacion.getArgument(0));
        when(conversacionRepository.save(any(Conversacion.class)))
                .thenAnswer(invocacion -> invocacion.getArgument(0));

        assertEquals(1, chatService.listarMensajes(20, tutorUsuario.getId()).size());
        assertEquals("Editado", chatService.editarMensaje(30L, estudianteUsuario.getId(), " Editado ")
                .getContenido());
        assertNotNull(chatService.marcarComoLeido(30L, tutorUsuario.getId()).getLeidoEn());
        assertNotNull(chatService.eliminarMensaje(30L, estudianteUsuario.getId()).getFechaEliminacion());
        assertEquals(EstadoConversacion.CERRADA,
                chatService.cerrarConversacion(20, tutorUsuario.getId()).getEstado());
    }

    @Test
    void rechazaMensajesInvalidosInactivosOCerrados() {
        when(conversacionRepository.findOneById(20)).thenReturn(Optional.of(conversacion));
        assertThrows(IllegalArgumentException.class,
                () -> chatService.enviarMensaje(20, 1, " "));

        estudianteUsuario.setActivo(false);
        when(usuarioRepository.findById(1)).thenReturn(Optional.of(estudianteUsuario));
        assertThrows(IllegalStateException.class,
                () -> chatService.enviarMensaje(20, 1, "Hola"));

        conversacion.setEstado(EstadoConversacion.CERRADA);
        assertThrows(IllegalStateException.class,
                () -> chatService.enviarMensaje(20, 2, "Hola"));
        verify(mensajeRepository, never()).save(any());
    }

    @Test
    void informaRecursosInexistentes() {
        when(conversacionRepository.findOneById(404)).thenReturn(Optional.empty());
        when(mensajeRepository.findOneById(404L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> chatService.listarMensajes(404, 1));
        assertThrows(IllegalArgumentException.class,
                () -> chatService.eliminarMensaje(404L, 1));
        assertTrue(conversacion.getMensajes().isEmpty());
    }

    private Usuario usuario(Integer id) {
        Usuario usuario = new Usuario();
        usuario.setId(id);
        usuario.setActivo(true);
        return usuario;
    }
}
