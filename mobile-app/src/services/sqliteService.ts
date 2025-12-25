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

// Fila cruda tal como viene de SQLite (snake_case)
type RawRegistroRow = {
  id: string;
  tipo: string;
  tipo_entidad: string;
  categoria: string;

  id_peaton: string | null;
  nombre: string | null;
  no_empleado: string | null;
  empresa: string | null;
  bodega: string | null;
  asunto: string | null;

  id_vehiculo: string | null;
  modelo: string | null;
  color: string | null;
  placa: string | null;
  foto_placas_path: string | null;

  qr_contenido: string | null;
  fecha_hora: string;

  synced: number; // en SQLite será 0 ó 1
  dispositivo_id: string;
};

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

  // 🔁 Mapea fila cruda de SQLite (snake_case) → modelo RegistroLocal (camelCase)
  private mapRowToRegistro(row: RawRegistroRow): RegistroLocal {
    return {
      id: row.id,
      tipo: row.tipo as TipoRegistro,
      tipoEntidad: row.tipo_entidad as TipoEntidad,
      categoria: row.categoria as CategoriaPersona,

      idPeaton: row.id_peaton ?? null,
      nombre: row.nombre ?? null,
      noEmpleado: row.no_empleado ?? null,
      empresa: row.empresa ?? null,
      bodega: row.bodega ?? null,
      asunto: row.asunto ?? null,

      idVehiculo: row.id_vehiculo ?? null,
      modelo: row.modelo ?? null,
      color: row.color ?? null,
      placa: row.placa ?? null,
      fotoPlacasPath: row.foto_placas_path ?? null,

      qrContenido: row.qr_contenido ?? null,
      fechaHora: row.fecha_hora,
      // 👇 aquí forzamos a que coincida con el tipo de RegistroLocal['synced']
      synced: row.synced as unknown as RegistroLocal['synced'],
      dispositivoId: row.dispositivo_id,
    };
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
      // 👇 igual, respetando el tipo que tenga RegistroLocal['synced']
      synced: 0 as unknown as RegistroLocal['synced'],
      dispositivoId: data.dispositivoId,
    };

    return registro;
  }

  async obtenerPendientes(): Promise<RegistroLocal[]> {
    const db = await this.getDb();
    const res = await db.query('SELECT * FROM registros WHERE synced = 0');
    const rows = (res.values ?? []) as RawRegistroRow[];
    return rows.map((r) => this.mapRowToRegistro(r));
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

  // 🔹 Traer todos los registros ordenados del más reciente al más viejo
  async obtenerRegistrosOrdenadosPorFechaDesc(): Promise<RegistroLocal[]> {
    const db = await this.getDb();
    const res = await db.query(
      `
      SELECT *
      FROM registros
      ORDER BY datetime(fecha_hora) DESC;
      `
    );
    const rows = (res.values ?? []) as RawRegistroRow[];
    return rows.map((r) => this.mapRowToRegistro(r));
  }

  // ==== BÚSQUEDAS PARA VALIDAR / AUTOLLENAR (último registro en general) ====

  async buscarUltimoPorPlacaHoy(placa: string): Promise<RegistroLocal | null> {
    const db = await this.getDb();
    const placaUpper = placa.toUpperCase();
    const res = await db.query(
      `
      SELECT *
      FROM registros
      WHERE placa = ?
      ORDER BY datetime(fecha_hora) DESC
      LIMIT 1;
      `,
      [placaUpper]
    );

    if (!res.values || res.values.length === 0) return null;
    const row = res.values[0] as RawRegistroRow;
    return this.mapRowToRegistro(row);
  }

  async buscarUltimoPorNoEmpleadoHoy(
    noEmpleado: string
  ): Promise<RegistroLocal | null> {
    const db = await this.getDb();
    const limpio = noEmpleado.trim().toUpperCase();
    const res = await db.query(
      `
      SELECT *
      FROM registros
      WHERE no_empleado = ?
      ORDER BY datetime(fecha_hora) DESC
      LIMIT 1;
      `,
      [limpio]
    );

    if (!res.values || res.values.length === 0) return null;
    const row = res.values[0] as RawRegistroRow;
    return this.mapRowToRegistro(row);
  }

  async buscarUltimoPorPersonaHoy(
    nombre: string,
    empresa: string,
    bodega: string
  ): Promise<RegistroLocal | null> {
    const db = await this.getDb();
    const res = await db.query(
      `
      SELECT *
      FROM registros
      WHERE nombre = ?
        AND empresa = ?
        AND bodega = ?
      ORDER BY datetime(fecha_hora) DESC
      LIMIT 1;
      `,
      [
        nombre.trim().toUpperCase(),
        empresa.trim().toUpperCase(),
        bodega.trim().toUpperCase(),
      ]
    );

    if (!res.values || res.values.length === 0) return null;
    const row = res.values[0] as RawRegistroRow;
    return this.mapRowToRegistro(row);
  }

  async buscarUltimoPorQRHoy(qr: string): Promise<RegistroLocal | null> {
    const db = await this.getDb();
    const res = await db.query(
      `
      SELECT *
      FROM registros
      WHERE qr_contenido = ?
      ORDER BY datetime(fecha_hora) DESC
      LIMIT 1;
      `,
      [qr]
    );

    if (!res.values || res.values.length === 0) return null;
    const row = res.values[0] as RawRegistroRow;
    return this.mapRowToRegistro(row);
  }
}

export const sqliteService = new SQLiteService();
