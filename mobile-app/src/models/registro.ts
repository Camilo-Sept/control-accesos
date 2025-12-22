// src/models/registro.ts

export type TipoRegistro = 'ENTRADA' | 'SALIDA';
export type TipoEntidad = 'PEATON' | 'VEHICULO';
export type CategoriaPersona = 'EMPLEADO' | 'PROVEEDOR' | 'VISITANTE';

export interface RegistroLocal {
  id: string;
  tipo: TipoRegistro;            // ENTRADA o SALIDA
  tipoEntidad: TipoEntidad;      // PEATON o VEHICULO
  categoria: CategoriaPersona;   // EMPLEADO / PROVEEDOR / VISITANTE

  // PERSONA A PIE
  idPeaton?: string | null;
  nombre?: string | null;
  noEmpleado?: string | null;
  empresa?: string | null;
  bodega?: string | null;
  asunto?: string | null;

  // VEHÍCULO
  idVehiculo?: string | null;
  modelo?: string | null;
  color?: string | null;
  placa?: string | null;
  fotoPlacasPath?: string | null; // ruta o nombre del archivo local

  // QR
  qrContenido?: string | null;

  // TIEMPO
  fechaHora: string;             // momento de este movimiento (entrada o salida)

  // METADATOS
  synced: 0 | 1;
  dispositivoId: string;
}
