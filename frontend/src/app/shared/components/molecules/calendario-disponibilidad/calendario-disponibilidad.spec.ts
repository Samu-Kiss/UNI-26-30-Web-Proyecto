import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiService } from '../../../../core/services/api.service';
import { CalendarioDisponibilidadComponent } from './calendario-disponibilidad';

describe('CalendarioDisponibilidadComponent', () => {
  let component: CalendarioDisponibilidadComponent;
  let fixture: ComponentFixture<CalendarioDisponibilidadComponent>;

  const mockAgenda = {
    horarios: [
      { diaSemana: 'LUNES', horaInicio: '08:00', horaFin: '12:00' },
      { diaSemana: 'MIERCOLES', horaInicio: '14:00', horaFin: '18:00' },
      { diaSemana: 'VIERNES', horaInicio: '09:00', horaFin: '13:00' },
    ],
    bloqueos: [{ fecha: '2030-05-20', horaInicio: '08:00', horaFin: '12:00', motivo: 'Viaje' }],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CalendarioDisponibilidadComponent],
      providers: [{ provide: ApiService, useValue: { agenda: () => of(mockAgenda) } }],
    });

    fixture = TestBed.createComponent(CalendarioDisponibilidadComponent);
    component = fixture.componentInstance;
  });

  it('debe crearse y calcular las celdas del mes correctamente', () => {
    fixture.componentRef.setInput('agenda', mockAgenda);
    fixture.componentRef.setInput('minFecha', '2030-05-01');
    component.mesVisual.set(new Date('2030-05-15T12:00:00'));
    fixture.detectChanges();

    expect(component.mesTexto()).toContain('mayo de 2030');
    const dias = component.diasMes();
    expect(dias.length).toBeGreaterThan(28);

    // 2030-05-01 fue miércoles (MIERCOLES), debe estar disponible según la agenda
    const miercoles1 = dias.find((d) => d?.fecha === '2030-05-01');
    expect(miercoles1?.disponible).toBe(true);

    // 2030-05-02 fue jueves (JUEVES), NO debe estar disponible según la agenda
    const jueves2 = dias.find((d) => d?.fecha === '2030-05-02');
    expect(jueves2?.disponible).toBe(false);

    // 2030-05-20 está bloqueado en bloqueos
    const bloqueado = dias.find((d) => d?.fecha === '2030-05-20');
    expect(bloqueado?.disponible).toBe(false);
  });

  it('emite fechaChange al hacer clic en un día disponible', () => {
    fixture.componentRef.setInput('agenda', mockAgenda);
    fixture.componentRef.setInput('minFecha', '2030-05-01');
    component.mesVisual.set(new Date('2030-05-15T12:00:00'));
    fixture.detectChanges();

    let fechaEmitida = '';
    component.fechaChange.subscribe((f) => (fechaEmitida = f));

    const miercoles1 = component.diasMes().find((d) => d?.fecha === '2030-05-01');
    component.seleccionar(miercoles1!);
    expect(fechaEmitida).toBe('2030-05-01');
  });

  it('no emite fechaChange al hacer clic en un día no disponible', () => {
    fixture.componentRef.setInput('agenda', mockAgenda);
    fixture.componentRef.setInput('minFecha', '2030-05-01');
    component.mesVisual.set(new Date('2030-05-15T12:00:00'));
    fixture.detectChanges();

    let emitida = false;
    component.fechaChange.subscribe(() => (emitida = true));

    const jueves2 = component.diasMes().find((d) => d?.fecha === '2030-05-02');
    component.seleccionar(jueves2!);
    expect(emitida).toBe(false);
  });

  it('navega entre meses correctamente incluso iniciando en el día 31', () => {
    component.mesVisual.set(new Date('2026-10-31T12:00:00'));
    fixture.detectChanges();
    component.cambiarMes(1);
    expect(component.mesVisual().getMonth()).toBe(10); // Noviembre
    component.cambiarMes(-1);
    expect(component.mesVisual().getMonth()).toBe(9); // Octubre
  });

  it('no reinicia el mes visual al cambiar de mes cuando fecha está seleccionada', () => {
    fixture.componentRef.setInput('fecha', '2026-10-30');
    fixture.detectChanges();
    expect(component.mesVisual().getMonth()).toBe(9); // Octubre
    component.cambiarMes(1);
    fixture.detectChanges();
    expect(component.mesVisual().getMonth()).toBe(10); // Noviembre
  });
});
