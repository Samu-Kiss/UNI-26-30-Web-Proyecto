import { MytStateService } from './myt-state.service';

describe('Estado compartido de tutorías', () => {
  let state: MytStateService;
  beforeEach(() => {
    state = new MytStateService();
  });

  it('ignora mensajes vacíos y agrega el texto limpio solo a la conversación elegida', () => {
    const antes = state.conversaciones();
    state.enviarMensaje(1, '   ');
    expect(state.conversaciones()).toBe(antes);
    state.enviarMensaje(999, 'Sin destinatario');
    expect(state.conversaciones()).toEqual(antes);
    state.enviarMensaje(1, '  Adjunto el taller  ');
    const despues = state.conversaciones();
    expect(despues[0].mensajes).toHaveLength(antes[0].mensajes.length + 1);
    expect(despues[0].mensajes.at(-1)).toMatchObject({
      autor: 'ESTUDIANTE',
      texto: 'Adjunto el taller',
    });
    expect(despues[0].ultimoMensaje).toBe('Adjunto el taller');
    expect(despues[0].ultimaHora).toBe('Ahora');
    expect(despues.slice(1)).toEqual(antes.slice(1));
    expect(antes[0].mensajes).toHaveLength(4);
  });

  it('antepone reseñas conservando las anteriores y sus etiquetas', () => {
    const anteriores = state.resenas();
    const nueva = {
      tutorId: 2,
      tutorNombre: 'Andrés',
      estudiante: 'Eva',
      calificacion: 4,
      comentario: 'Muy claro',
      etiquetas: ['Material útil'],
      tema: 'SQL',
      publica: false,
    };
    state.agregarResena(nueva);
    expect(state.resenas()[0]).toEqual({ ...nueva, id: anteriores.length + 1, fecha: 'Hoy' });
    expect(state.resenas().slice(1)).toEqual(anteriores);
  });

  it('reprograma y cancela únicamente la tutoría seleccionada', () => {
    const anteriores = state.eventosCalendario();
    state.reprogramarEvento(1, '2026-09-09', '10:00 a. m.');
    expect(state.eventosCalendario()[0]).toMatchObject({
      diaMes: 9,
      fechaCorta: '09 SEP',
      horaInicio: '10:00 a. m.',
      rangoHora: '10:00 a. m. (reprogramada)',
      estado: 'PENDIENTE',
    });
    state.cancelarEvento(1);
    expect(state.eventosCalendario()[0].estado).toBe('CANCELADA');
    expect(state.eventosCalendario().slice(1)).toEqual(anteriores.slice(1));
    const actual = state.eventosCalendario();
    state.cancelarEvento(999);
    expect(state.eventosCalendario()).toEqual(actual);
  });
});
