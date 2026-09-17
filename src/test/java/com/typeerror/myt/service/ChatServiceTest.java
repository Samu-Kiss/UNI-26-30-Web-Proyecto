package com.typeerror.myt.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.typeerror.myt.entities.Conversacion;
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

        assertThrows(IllegalArgumentException.class,
                () -> chatService.marcarComoLeido(30L, estudianteUsuario.getId()));
    }

    private Usuario usuario(Integer id) {
        Usuario usuario = new Usuario();
        usuario.setId(id);
        usuario.setActivo(true);
        return usuario;
    }
}
