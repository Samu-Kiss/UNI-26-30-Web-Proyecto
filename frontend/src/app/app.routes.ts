import { Routes } from '@angular/router';
import { sessionGuard } from './core/services/auth.service';
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'tutores' },
  {
    path: 'tutores',
    canActivate: [sessionGuard],
    loadComponent: () =>
      import('./pages/tutores-page/tutores-page').then((m) => m.TutoresPageComponent),
  },
  {
    path: 'reservas',
    canActivate: [sessionGuard],
    loadComponent: () =>
      import('./pages/reservas-page/reservas-page').then((m) => m.ReservasPageComponent),
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
