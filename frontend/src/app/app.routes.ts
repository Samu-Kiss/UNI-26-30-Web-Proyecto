import { Routes } from '@angular/router';
import { sessionGuard } from './core/services/auth.service';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'tutores' },
  {
    path: 'landing',
    loadComponent: () =>
      import('./pages/landing-page/landing-page').then((m) => m.LandingPageComponent),
  },
  {
    path: 'tutores',
    canActivate: [sessionGuard],
    loadComponent: () =>
      import('./pages/tutores-page/tutores-page').then((m) => m.TutoresPageComponent),
  },
  {
    path: 'tutores/:id',
    loadComponent: () =>
      import('./pages/tutor-perfil-page/tutor-perfil-page').then(
        (m) => m.TutorPerfilPageComponent,
      ),
  },
  {
    path: 'reservas',
    canActivate: [sessionGuard],
    loadComponent: () =>
      import('./pages/reservas-page/reservas-page').then((m) => m.ReservasPageComponent),
  },
  {
    path: 'reservas/:id',
    loadComponent: () =>
      import('./pages/reserva-detalle-page/reserva-detalle-page').then(
        (m) => m.ReservaDetallePageComponent,
      ),
  },
  {
    path: 'calendario',
    loadComponent: () =>
      import('./pages/calendario-page/calendario-page').then((m) => m.CalendarioPageComponent),
  },
  {
    path: 'mensajes',
    loadComponent: () =>
      import('./pages/mensajes-page/mensajes-page').then((m) => m.MensajesPageComponent),
  },
  {
    path: 'resenas',
    loadComponent: () =>
      import('./pages/resenas-page/resenas-page').then((m) => m.ResenasPageComponent),
  },
  {
    path: 'menu',
    loadComponent: () =>
      import('./pages/menu-rol-page/menu-rol-page').then((m) => m.MenuRolPageComponent),
  },
  {
    path: 'estudiante',
    data: { rol: 'ESTUDIANTE' },
    loadComponent: () =>
      import('./pages/menu-rol-page/menu-rol-page').then((m) => m.MenuRolPageComponent),
  },
  {
    path: 'tutor',
    data: { rol: 'TUTOR' },
    loadComponent: () =>
      import('./pages/menu-rol-page/menu-rol-page').then((m) => m.MenuRolPageComponent),
  },
  {
    path: 'admin',
    data: { rol: 'ADMINISTRADOR' },
    loadComponent: () =>
      import('./pages/menu-rol-page/menu-rol-page').then((m) => m.MenuRolPageComponent),
  },
  {
    path: 'estudiantes',
    loadComponent: () =>
      import('./pages/estudiantes-page/estudiantes-page').then((m) => m.EstudiantesPageComponent),
  },
  {
    path: 'administradores',
    loadComponent: () =>
      import('./pages/administradores-page/administradores-page').then(
        (m) => m.AdministradoresPageComponent,
      ),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login-page/login-page').then((m) => m.LoginPageComponent),
  },
  {
    path: 'usuarios',
    canActivate: [sessionGuard],
    data: { admin: true },
    loadComponent: () =>
      import('./pages/usuarios-page/usuarios-page').then((m) => m.UsuariosPageComponent),
  },
  {
    path: 'usuarios/nuevo',
    canActivate: [sessionGuard],
    data: { admin: true },
    loadComponent: () =>
      import('./pages/usuarios-page/usuarios-page').then((m) => m.UsuariosPageComponent),
  },
  { path: '**', redirectTo: 'tutores' },
];
