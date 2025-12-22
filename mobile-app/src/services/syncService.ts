// src/services/syncService.ts

import { Network } from '@capacitor/network';
import { sqliteService } from './sqliteService';
import { RegistroLocal } from '../models/registro';

const API_BASE = 'https://tu-backend-ejemplo.com/api'; // luego lo cambiamos

class SyncService {
  private syncing = false;

  async syncPendientes(manual = false): Promise<{ enviados: number }> {
    if (this.syncing) return { enviados: 0 };
    this.syncing = true;

    try {
      const status = await Network.getStatus();
      if (!status.connected) {
        if (manual) {
          throw new Error('Sin conexión a internet');
        }
        return { enviados: 0 };
      }

      const pendientes: RegistroLocal[] = await sqliteService.obtenerPendientes();
      if (!pendientes.length) return { enviados: 0 };

      const resp = await fetch(`${API_BASE}/registros/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'API_KEY_DEL_DISPOSITIVO',
        },
        body: JSON.stringify({
          dispositivoId: pendientes[0].dispositivoId,
          registros: pendientes,
        }),
      });

      if (!resp.ok) {
        throw new Error(`Error backend: ${resp.status}`);
      }

      const json = await resp.json();
      const confirmados: string[] =
        json.confirmados ?? pendientes.map((r) => r.id);

      await sqliteService.marcarComoSincronizados(confirmados);

      return { enviados: confirmados.length };
    } finally {
      this.syncing = false;
    }
  }

  async registrarAutoSync() {
    await Network.addListener('networkStatusChange', async (status) => {
      if (status.connected) {
        await this.syncPendientes(false);
      }
    });
  }
}

export const syncService = new SyncService();
