export interface Tutor {
  readonly id: number;
  readonly nombreCompleto: string;
  readonly materias: readonly string[];
  readonly tarifaPorHora: number;
  readonly calificacion: number;
  readonly disponible: boolean;
}
