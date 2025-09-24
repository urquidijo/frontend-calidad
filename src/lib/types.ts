export type Rol = 'SUPERADMIN' | 'ADMIN_COLEGIO' | 'CONDUCTOR' | 'PADRE';

export type User = {
  id: number;
  email: string;
  rol: Rol;
  nombre: string;
};

export type LoginResponse = {
  access_token: string;
  user: User;
};

export type Colegio = {
  id: number;
  nombre: string;
  direccion?: string | null;
  lat?: number | null;
  lon?: number | null;
  activo: boolean;
};

export type Estudiante = {
  id: number;
  nombre: string;
  codigo: string;
  ci?: string | null;
  curso?: string | null;
  colegioId: number;
  activo: boolean;
};

export type LookupResponse = {
  ok: boolean;
  estudiante: Estudiante;
};

export type HijoVinculado = {
  vinculadoDesde: string;
  estudiante: {
    id: number;
    nombre: string;
    codigo: string;
    ci?: string | null;
    curso?: string | null;
    activo: boolean;
    colegio: { id: number; nombre: string };
  };
};
