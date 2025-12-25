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
      let status;
      try {
        status = await Network.getStatus();
      } catch (err) {
        console.error('Error obteniendo estado de red:', err);
        if (manual) {
          throw new Error('No se pudo obtener el estado de la conexión.');
        }
        return { enviados: 0 };
      }

      if (!status?.connected) {
        if (manual) {
          throw new Error('Sin conexión a internet');
        }
        return { enviados: 0 };
      }

      const pendientes: RegistroLocal[] = await sqliteService.obtenerPendientes();
      if (!pendientes.length) {
        return { enviados: 0 };
      }

      let resp: Response;
      try {
        resp = await fetch(`${API_BASE}/registros/batch`, {
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
      } catch (err) {
        console.error('Error de red al hacer fetch al backend:', err);
        if (manual) {
          throw new Error('No se pudo conectar al servidor.');
        }
        return { enviados: 0 };
      }

      if (!resp.ok) {
        const msg = `Error backend: ${resp.status}`;
        console.error(msg);
        if (manual) {
          throw new Error(msg);
        }
        return { enviados: 0 };
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
    try {
      await Network.addListener('networkStatusChange', async (status) => {
        if (status.connected) {
          try {
            await this.syncPendientes(false);
          } catch (err) {
            console.error('Error durante auto-sync:', err);
            // Nunca propagamos error hacia React desde aquí
          }
        }
      });
    } catch (err) {
      console.error('No se pudo registrar listener de auto-sync:', err);
    }
  }
}

export const syncService = new SyncService();
