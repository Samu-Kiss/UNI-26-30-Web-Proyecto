import { MytStateService } from './myt-state.service';
describe('Estado inicial sin datos ficticios', () => {
  it('no presenta reservas, estudiantes, reseñas, chats ni horarios de ejemplo', () => {
    const state = new MytStateService();
    expect(state.resenas()).toEqual([]);
    expect(state.conversaciones()).toEqual([]);
    expect(state.eventosCalendario()).toEqual([]);
    expect(state.estudiantesBase()).toEqual([]);
    expect(state.disponibilidadPorDefecto).toEqual([]);
  });
});
