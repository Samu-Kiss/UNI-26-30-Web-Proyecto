import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LucideIconComponent } from '../../shared/components/atoms/lucide-icon/lucide-icon';

export type RolMenu = 'ESTUDIANTE' | 'TUTOR' | 'ADMINISTRADOR';

@Component({
  selector: 'app-menu-rol-page',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideIconComponent],
  templateUrl: './menu-rol-page.html',
  styleUrl: './menu-rol-page.css',
})
export class MenuRolPageComponent {
  readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly rolVista = signal<RolMenu>('ESTUDIANTE');

  readonly nombreUsuario = computed(() => this.auth.sesion()?.nombreUsuario ?? 'Usuario MyT');

  readonly etiquetaPanel = computed(() => {
    const r = this.rolVista();
    if (r === 'TUTOR') return 'Panel de tutor';
    if (r === 'ADMINISTRADOR') return 'Panel administrativo';
    return 'Panel de estudiante';
  });

  readonly descripcionPanel = computed(() => {
    const r = this.rolVista();
    if (r === 'TUTOR') return 'Consulta las solicitudes de reserva y administra tus tutorías.';
    if (r === 'ADMINISTRADOR') return 'Selecciona el módulo que deseas consultar o administrar.';
    return 'Gestiona tus reservas y consulta los tutores disponibles.';
  });

  constructor() {
    const dataRol = this.route.snapshot.data['rol'] as RolMenu | undefined;
    const sesionRol = this.auth.sesion()?.rol as RolMenu | undefined;
    if (dataRol) {
      this.rolVista.set(dataRol);
    } else if (sesionRol) {
      this.rolVista.set(sesionRol);
    }
  }
}
