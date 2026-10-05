export interface Credenciales {
  correo: string;
  contrasena: string;
}

export interface Usuario {
  id?: number;
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
  activo: boolean;
  roles: ('ESTUDIANTE' | 'TUTOR' | 'ADMINISTRADOR')[];
}

export interface RegistroUsuario extends Usuario {
  contrasena: string;
  rol: 'ESTUDIANTE' | 'TUTOR';
  codigoEstudiantil: string;
  universidad: string;
  programaAcademico: string;
  semestre: string;
  biografia: string;
  materias: string;
  tarifaPorHora: string;
}
