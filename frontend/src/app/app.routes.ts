import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./pages/tutores-page/tutores-page').then((m) => m.TutoresPageComponent),
  },
  {
    path: 'tutores',
    loadComponent: () =>
      import('./pages/tutores-page/tutores-page').then((m) => m.TutoresPageComponent),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login-page/login-page').then((m) => m.LoginPageComponent),
  },
  {
    path: 'usuarios/nuevo',
    loadComponent: () =>
      import('./pages/usuarios-page/usuarios-page').then((m) => m.UsuariosPageComponent),
  },
  { path: '**', redirectTo: '' },
];
