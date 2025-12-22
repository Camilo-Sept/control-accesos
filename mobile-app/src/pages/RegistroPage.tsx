// src/pages/RegistroPage.tsx

import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonToast,
  IonItem,
  IonLabel,
  IonInput,
  IonList,
  IonSegment,
  IonSegmentButton,
  IonText,
} from '@ionic/react';
import { sqliteService } from '../services/sqliteService';
import { syncService } from '../services/syncService';
import {
  TipoRegistro,
  TipoEntidad,
  CategoriaPersona,
} from '../models/registro';

const DISPOSITIVO_ID = 'tablet-puerta-1';

type ModoCaptura = 'QR' | 'MANUAL';

const RegistroPage: React.FC = () => {
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [pendientes, setPendientes] = useState<number>(0);

  const [tipoRegistro, setTipoRegistro] = useState<TipoRegistro>('ENTRADA');
  const [tipoEntidad, setTipoEntidad] = useState<TipoEntidad>('PEATON');
  const [categoria, setCategoria] =
    useState<CategoriaPersona>('EMPLEADO');
  const [modoCaptura, setModoCaptura] =
    useState<ModoCaptura>('MANUAL');

  // PERSONA A PIE
  const [idPeaton, setIdPeaton] = useState('');
  const [nombre, setNombre] = useState('');
  const [noEmpleado, setNoEmpleado] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [bodega, setBodega] = useState('');
  const [asunto, setAsunto] = useState('');

  // VEHÍCULO
  const [idVehiculo, setIdVehiculo] = useState('');
  const [modelo, setModelo] = useState('');
  const [color, setColor] = useState('');
  const [placa, setPlaca] = useState('');
  // fotoPlacasPath la dejamos para después cuando integremos cámara

  const actualizarPendientes = async () => {
    const regs = await sqliteService.obtenerPendientes();
    setPendientes(regs.length);
  };

  useEffect(() => {
    (async () => {
      await actualizarPendientes();
      await syncService.registrarAutoSync();
    })();
  }, []);

  const manejarScanQR = async () => {
    // Aquí luego integramos el QR real:
    // - Para empleados de Impulso: llenar nombre, bodega, noEmpleado, etc.
    // - Para vehículos de empleados: modelo, color, placas, nombre...
    setMensaje('Escaneo de QR todavía no implementado (placeholder).');
  };

  const limpiarFormulario = () => {
    setIdPeaton('');
    setNombre('');
    setNoEmpleado('');
    setEmpresa('');
    setBodega('');
    setAsunto('');

    setIdVehiculo('');
    setModelo('');
    setColor('');
    setPlaca('');
  };

  const validar = (): string | null => {
    // Todos los casos necesitan al menos algo que identifique al registro
    if (tipoEntidad === 'PEATON') {
      if (!nombre.trim()) return 'El nombre es obligatorio para peatón.';
      if (categoria === 'EMPLEADO' && !noEmpleado.trim()) {
        return 'El número de empleado es obligatorio para empleados.';
      }
    }

    if (tipoEntidad === 'VEHICULO') {
      if (!placa.trim()) return 'Las placas del vehículo son obligatorias.';
      if (!nombre.trim()) {
        return 'El nombre del conductor/empleado es obligatorio.';
      }
    }

    if (!bodega.trim()) return 'La bodega es obligatoria.';
    if (!asunto.trim()) return 'El asunto es obligatorio.';

    return null;
  };

  const guardarRegistro = async () => {
    const error = validar();
    if (error) {
      setMensaje(error);
      return;
    }

    const qrContenido =
      modoCaptura === 'QR'
        ? 'QR_PENDIENTE' // luego se reemplaza con el valor real del QR
        : null;

    await sqliteService.insertarRegistro({
      tipo: tipoRegistro,
      tipoEntidad,
      categoria,

      idPeaton: tipoEntidad === 'PEATON' ? idPeaton.trim() || null : null,
      nombre: nombre.trim() || null,
      noEmpleado: noEmpleado.trim() || null,
      empresa: empresa.trim() || null,
      bodega: bodega.trim() || null,
      asunto: asunto.trim() || null,

      idVehiculo: tipoEntidad === 'VEHICULO' ? idVehiculo.trim() || null : null,
      modelo: tipoEntidad === 'VEHICULO' ? modelo.trim() || null : null,
      color: tipoEntidad === 'VEHICULO' ? color.trim() || null : null,
      placa: tipoEntidad === 'VEHICULO'
        ? placa.trim().toUpperCase()
        : null,
      fotoPlacasPath: null, // luego con cámara

      qrContenido,
      dispositivoId: DISPOSITIVO_ID,
    });

    await actualizarPendientes();
    limpiarFormulario();
    setMensaje('Registro guardado localmente (offline).');
  };

  const sincronizarAhora = async () => {
    try {
      setSyncStatus('Sincronizando...');
      const { enviados } = await syncService.syncPendientes(true);
      await actualizarPendientes();
      setSyncStatus(`Sincronización completa. Registros enviados: ${enviados}`);
    } catch (e: unknown) {
      await actualizarPendientes();
      if (e instanceof Error) {
        setSyncStatus(`Error de sincronización: ${e.message}`);
      } else {
        setSyncStatus('Error de sincronización desconocido');
      }
    }
  };

  const etiquetaEntidad =
    tipoEntidad === 'PEATON' ? 'Peatón' : 'Vehículo';

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Control de Accesos</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonList>
          {/* ENTRADA / SALIDA */}
          <IonItem>
            <IonLabel>Tipo de movimiento</IonLabel>
          </IonItem>
          <IonItem>
            <IonSegment
              value={tipoRegistro}
              onIonChange={(e) =>
                setTipoRegistro(e.detail.value as TipoRegistro)
              }
            >
              <IonSegmentButton value="ENTRADA">
                <IonLabel>Entrada</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="SALIDA">
                <IonLabel>Salida</IonLabel>
              </IonSegmentButton>
            </IonSegment>
          </IonItem>

          {/* PEATÓN / VEHÍCULO */}
          <IonItem>
            <IonLabel>Tipo</IonLabel>
          </IonItem>
          <IonItem>
            <IonSegment
              value={tipoEntidad}
              onIonChange={(e) =>
                setTipoEntidad(e.detail.value as TipoEntidad)
              }
            >
              <IonSegmentButton value="PEATON">
                <IonLabel>Peatón</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="VEHICULO">
                <IonLabel>Vehículo</IonLabel>
              </IonSegmentButton>
            </IonSegment>
          </IonItem>

          {/* EMPLEADO / PROVEEDOR / VISITANTE */}
          <IonItem>
            <IonLabel>Categoría</IonLabel>
          </IonItem>
          <IonItem>
            <IonSegment
              value={categoria}
              onIonChange={(e) =>
                setCategoria(e.detail.value as CategoriaPersona)
              }
            >
              <IonSegmentButton value="EMPLEADO">
                <IonLabel>Empleado</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="PROVEEDOR">
                <IonLabel>Proveedor</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="VISITANTE">
                <IonLabel>Visitante</IonLabel>
              </IonSegmentButton>
            </IonSegment>
          </IonItem>

          {/* MODO DE CAPTURA */}
          <IonItem>
            <IonLabel>Modo de captura</IonLabel>
          </IonItem>
          <IonItem>
            <IonSegment
              value={modoCaptura}
              onIonChange={(e) =>
                setModoCaptura(e.detail.value as ModoCaptura)
              }
            >
              <IonSegmentButton value="QR">
                <IonLabel>QR</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="MANUAL">
                <IonLabel>Manual</IonLabel>
              </IonSegmentButton>
            </IonSegment>
          </IonItem>

          {/* Botón de QR */}
          {modoCaptura === 'QR' && (
            <IonItem>
              <IonButton expand="block" onClick={manejarScanQR}>
                Escanear QR ({etiquetaEntidad})
              </IonButton>
            </IonItem>
          )}

          {/* CAMPOS DE PEATÓN */}
          {tipoEntidad === 'PEATON' && (
            <>
              <IonItem>
                <IonLabel position="stacked">ID Peatón</IonLabel>
                <IonInput
                  value={idPeaton}
                  onIonChange={(e) => setIdPeaton(e.detail.value ?? '')}
                  placeholder="ID interno si aplica"
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Nombre</IonLabel>
                <IonInput
                  value={nombre}
                  onIonChange={(e) => setNombre(e.detail.value ?? '')}
                  placeholder="Nombre de la persona"
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">No. Empleado</IonLabel>
                <IonInput
                  value={noEmpleado}
                  onIonChange={(e) => setNoEmpleado(e.detail.value ?? '')}
                  placeholder="Solo para empleados"
                />
              </IonItem>
            </>
          )}

          {/* CAMPOS DE VEHÍCULO */}
          {tipoEntidad === 'VEHICULO' && (
            <>
              <IonItem>
                <IonLabel position="stacked">ID Vehículo</IonLabel>
                <IonInput
                  value={idVehiculo}
                  onIonChange={(e) => setIdVehiculo(e.detail.value ?? '')}
                  placeholder="ID interno si aplica"
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Modelo</IonLabel>
                <IonInput
                  value={modelo}
                  onIonChange={(e) => setModelo(e.detail.value ?? '')}
                  placeholder="Modelo del vehículo"
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Color</IonLabel>
                <IonInput
                  value={color}
                  onIonChange={(e) => setColor(e.detail.value ?? '')}
                  placeholder="Color del vehículo"
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Placas</IonLabel>
                <IonInput
                  value={placa}
                  onIonChange={(e) => setPlaca(e.detail.value ?? '')}
                  placeholder="Ej. ABC-1234"
                />
              </IonItem>
            </>
          )}

          {/* CAMPOS COMUNES */}
          <IonItem>
            <IonLabel position="stacked">Empresa</IonLabel>
            <IonInput
              value={empresa}
              onIonChange={(e) => setEmpresa(e.detail.value ?? '')}
              placeholder="Impulso, EXPEDITORS, otra..."
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Bodega</IonLabel>
            <IonInput
              value={bodega}
              onIonChange={(e) => setBodega(e.detail.value ?? '')}
              placeholder="Ej. Bodega 1, Almacén A..."
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Asunto</IonLabel>
            <IonInput
              value={asunto}
              onIonChange={(e) => setAsunto(e.detail.value ?? '')}
              placeholder="Motivo de la visita / movimiento"
            />
          </IonItem>
        </IonList>

        {/* BOTONES */}
        <IonButton expand="block" onClick={guardarRegistro}>
          Guardar registro offline
        </IonButton>

        <IonButton expand="block" fill="outline" onClick={sincronizarAhora}>
          Sincronizar ahora
        </IonButton>

        {/* ESTADO */}
        <p style={{ marginTop: 16 }}>
          Pendientes sin sincronizar:{' '}
          <strong>{pendientes}</strong>
        </p>

        {syncStatus && (
          <IonText color="medium">
            <p style={{ marginTop: 8 }}>{syncStatus}</p>
          </IonText>
        )}

        <IonToast
          isOpen={!!mensaje}
          message={mensaje ?? ''}
          duration={2500}
          onDidDismiss={() => setMensaje(null)}
        />
      </IonContent>
    </IonPage>
  );
};

export default RegistroPage;
