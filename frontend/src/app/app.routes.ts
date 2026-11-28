import { Route, Routes } from '@angular/router';
import { sessionGuard } from './core/services/auth.service';

const loadMenuRol: NonNullable<Route['loadComponent']> = () =>
  import('./pages/menu-rol-page/menu-rol-page').then((m) => m.MenuRolPageComponent);

const loadUsuarios: NonNullable<Route['loadComponent']> = () =>
  import('./pages/usuarios-page/usuarios-page').then((m) => m.UsuariosPageComponent);

const rutaProtegida = (
  path: string,
  loadComponent: NonNullable<Route['loadComponent']>,
  admin = false,
): Route => ({
  path,
  canActivate: [sessionGuard],
  ...(admin ? { data: { admin: true } } : {}),
  loadComponent,
});

const rutaMenuRol = (path: string, rol?: string): Route => ({
  path,
  ...(rol ? { data: { rol } } : {}),
  loadComponent: loadMenuRol,
});

export const routes: Routes = [
  rutaProtegida('mi-perfil', () =>
    import('./pages/perfil-page/perfil-page').then((m) => m.PerfilPageComponent),
  ),
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./pages/landing-page/landing-page').then((m) => m.LandingPageComponent),
  },
  { path: 'landing', redirectTo: '', pathMatch: 'full' },
  rutaProtegida('tutores', () =>
    import('./pages/tutores-page/tutores-page').then((m) => m.TutoresPageComponent),
  ),
  rutaProtegida('tutores/:id', () =>
    import('./pages/tutor-perfil-page/tutor-perfil-page').then((m) => m.TutorPerfilPageComponent),
  ),
  rutaProtegida('reservas', () =>
    import('./pages/reservas-page/reservas-page').then((m) => m.ReservasPageComponent),
  ),
  rutaProtegida('reservas/:id', () =>
    import('./pages/reserva-detalle-page/reserva-detalle-page').then(
      (m) => m.ReservaDetallePageComponent,
    ),
  ),
  rutaProtegida('calendario', () =>
    import('./pages/calendario-page/calendario-page').then((m) => m.CalendarioPageComponent),
  ),
  rutaProtegida('mensajes', () =>
    import('./pages/mensajes-page/mensajes-page').then((m) => m.MensajesPageComponent),
  ),
  rutaProtegida('resenas', () =>
    import('./pages/resenas-page/resenas-page').then((m) => m.ResenasPageComponent),
  ),
  rutaMenuRol('menu'),
  rutaMenuRol('estudiante', 'ESTUDIANTE'),
  rutaMenuRol('tutor', 'TUTOR'),
  rutaMenuRol('admin', 'ADMINISTRADOR'),
  rutaProtegida(
    'estudiantes',
    () =>
      import('./pages/estudiantes-page/estudiantes-page').then((m) => m.EstudiantesPageComponent),
    true,
  ),
  rutaProtegida(
    'administradores',
    () =>
      import('./pages/administradores-page/administradores-page').then(
        (m) => m.AdministradoresPageComponent,
      ),
    true,
  ),
  {
    path: 'login',
    loadComponent: () => import('./pages/login-page/login-page').then((m) => m.LoginPageComponent),
  },
  {
    path: 'registro',
    loadComponent: () =>
      import('./pages/registro-page/registro-page').then((m) => m.RegistroPageComponent),
  },
  rutaProtegida('usuarios', loadUsuarios, true),
  rutaProtegida('usuarios/nuevo', loadUsuarios, true),
  rutaProtegida('pago', () => import('./pages/pago-page/pago-page').then((m) => m.PagoPageComponent)),
  rutaProtegida('pago/resultado', () =>
    import('./pages/pago-page/pago-page').then((m) => m.PagoPageComponent),
  ),
  { path: '**', redirectTo: '' },
];
