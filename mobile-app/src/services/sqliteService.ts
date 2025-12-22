// src/services/sqliteService.ts

import { Capacitor } from '@capacitor/core';
import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection,
} from '@capacitor-community/sqlite';
import { v4 as uuid } from 'uuid';
import {
  RegistroLocal,
  TipoRegistro,
  TipoEntidad,
  CategoriaPersona,
} from '../models/registro';

const DB_NAME = 'control_accesos.db';

class SQLiteService {
  private sqlite = new SQLiteConnection(CapacitorSQLite);
  private db: SQLiteDBConnection | null = null;

  private async getDb(): Promise<SQLiteDBConnection> {
    if (this.db) return this.db;

    const platform = Capacitor.getPlatform();

    if (platform === 'web') {
      await this.sqlite.initWebStore();
    }

    const ret = await this.sqlite.checkConnectionsConsistency();
    const isConn = (await this.sqlite.isConnection(DB_NAME, false)).result;

    if (ret.result && isConn) {
      this.db = await this.sqlite.retrieveConnection(DB_NAME, false);
    } else {
      this.db = await this.sqlite.createConnection(
        DB_NAME,
        false,
        'no-encryption',
        1,
        false
      );
    }

    await this.db.open();

    // Tabla con todos los campos que definimos
    // AHORA: id_local autoincremental + id (UUID) único
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS registros (
        id_local INTEGER PRIMARY KEY AUTOINCREMENT,
        id TEXT NOT NULL UNIQUE,

        tipo TEXT NOT NULL,
        tipo_entidad TEXT NOT NULL,
        categoria TEXT NOT NULL,

        id_peaton TEXT,
        nombre TEXT,
        no_empleado TEXT,
        empresa TEXT,
        bodega TEXT,
        asunto TEXT,

        id_vehiculo TEXT,
        modelo TEXT,
        color TEXT,
        placa TEXT,
        foto_placas_path TEXT,

        qr_contenido TEXT,
        fecha_hora TEXT NOT NULL,

        synced INTEGER NOT NULL DEFAULT 0,
        dispositivo_id TEXT NOT NULL
      );
    `);

    return this.db;
  }

  async insertarRegistro(data: {
    tipo: TipoRegistro;
    tipoEntidad: TipoEntidad;
    categoria: CategoriaPersona;

    idPeaton?: string | null;
    nombre?: string | null;
    noEmpleado?: string | null;
    empresa?: string | null;
    bodega?: string | null;
    asunto?: string | null;

    idVehiculo?: string | null;
    modelo?: string | null;
    color?: string | null;
    placa?: string | null;
    fotoPlacasPath?: string | null;

    qrContenido?: string | null;
    dispositivoId: string;
  }): Promise<RegistroLocal> {
    const db = await this.getDb();
    const id = uuid();
    const fechaHora = new Date().toISOString();

    await db.run(
      `INSERT INTO registros
       (id, tipo, tipo_entidad, categoria,
        id_peaton, nombre, no_empleado, empresa, bodega, asunto,
        id_vehiculo, modelo, color, placa, foto_placas_path,
        qr_contenido, fecha_hora, synced, dispositivo_id)
       VALUES (?, ?, ?, ?,
               ?, ?, ?, ?, ?, ?,
               ?, ?, ?, ?, ?,
               ?, ?, 0, ?)`,
      [
        id,
        data.tipo,
        data.tipoEntidad,
        data.categoria,

        data.idPeaton ?? null,
        data.nombre ?? null,
        data.noEmpleado ?? null,
        data.empresa ?? null,
        data.bodega ?? null,
        data.asunto ?? null,

        data.idVehiculo ?? null,
        data.modelo ?? null,
        data.color ?? null,
        data.placa ?? null,
        data.fotoPlacasPath ?? null,

        data.qrContenido ?? null,
        fechaHora,
        data.dispositivoId,
      ]
    );

    const registro: RegistroLocal = {
      id,
      tipo: data.tipo,
      tipoEntidad: data.tipoEntidad,
      categoria: data.categoria,

      idPeaton: data.idPeaton ?? null,
      nombre: data.nombre ?? null,
      noEmpleado: data.noEmpleado ?? null,
      empresa: data.empresa ?? null,
      bodega: data.bodega ?? null,
      asunto: data.asunto ?? null,

      idVehiculo: data.idVehiculo ?? null,
      modelo: data.modelo ?? null,
      color: data.color ?? null,
      placa: data.placa ?? null,
      fotoPlacasPath: data.fotoPlacasPath ?? null,

      qrContenido: data.qrContenido ?? null,
      fechaHora,
      synced: 0,
      dispositivoId: data.dispositivoId,
    };

    return registro;
  }

  async obtenerPendientes(): Promise<RegistroLocal[]> {
    const db = await this.getDb();
    const res = await db.query('SELECT * FROM registros WHERE synced = 0');
    return (res.values ?? []) as RegistroLocal[];
  }

  async marcarComoSincronizados(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const db = await this.getDb();
    const placeholders = ids.map(() => '?').join(',');
    await db.run(
      `UPDATE registros SET synced = 1 WHERE id IN (${placeholders})`,
      ids
    );
  }
}

export const sqliteService = new SQLiteService();
