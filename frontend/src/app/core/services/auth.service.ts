import { HttpClient, HttpInterceptorFn } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, finalize, map, of, shareReplay, tap } from 'rxjs';
import { Credenciales } from '../models/usuario.model';

export interface Sesion {
  rol: 'ADMINISTRADOR' | 'ESTUDIANTE' | 'TUTOR';
  perfilId: number;
  nombreUsuario: string;
}
export interface EstadoSesion {
  actual: Sesion | null;
  opciones: string[];
}

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const base = inject(DOCUMENT).defaultView?.__MYT_CONFIG__?.backendUrl?.replace(/\/+$/, '') ?? '';
  return next(
    req.url.startsWith('/api/')
      ? req.clone({
          url: `${base}${req.url}`,
          withCredentials: true,
          setHeaders: { 'X-MYT-Request': '1' },
        })
      : req,
  );
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  readonly sesion = signal<Sesion | null>(null);
  readonly opciones = signal<string[]>([]);
  readonly cargando = signal(true);
  private restauracion?: ReturnType<AuthService['consultarSesion']>;
  private consultarSesion() {
    return this.http.get<EstadoSesion>('/api/sesion').pipe(
      tap(this.aplicar),
      catchError((error) => {
        this.sesion.set(null);
        this.opciones.set([]);
        throw error;
      }),
      finalize(() => {
        this.cargando.set(false);
        this.restauracion = undefined;
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
  }
  private readonly aplicar = (estado: EstadoSesion) => {
    this.sesion.set(estado.actual);
    this.opciones.set(estado.opciones);
  };
  iniciarSesion(datos: Credenciales) {
    return this.http.post<EstadoSesion>('/api/sesion/login', datos).pipe(tap(this.aplicar));
  }
  restaurar() {
    this.cargando.set(true);
    this.restauracion ??= this.consultarSesion();
    return this.restauracion;
  }
  elegir(perfil: string) {
    return this.http.post<EstadoSesion>('/api/sesion/perfil', { perfil }).pipe(tap(this.aplicar));
  }
  cerrar() {
    return this.http.post<void>('/api/sesion/logout', {}).pipe(
      tap(() => {
        this.sesion.set(null);
        this.opciones.set([]);
      }),
    );
  }
}
export const sessionGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const actual = auth.sesion();
  if (actual) {
    return route.data['admin'] && actual.rol !== 'ADMINISTRADOR'
      ? router.createUrlTree(['/tutores'])
      : true;
  }
  return auth.restaurar().pipe(
    map((estado) => {
      if (!estado.actual) return router.createUrlTree(['/login']);
      return route.data['admin'] && estado.actual.rol !== 'ADMINISTRADOR'
        ? router.createUrlTree(['/tutores'])
        : true;
    }),
    catchError(() => of(router.createUrlTree(['/login']))),
  );
};
