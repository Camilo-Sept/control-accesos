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
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
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

  // Datos persona / conductor
  const [nombre, setNombre] = useState('');
  const [noEmpleado, setNoEmpleado] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [bodega, setBodega] = useState('');
  const [asunto, setAsunto] = useState('');

  // Datos vehículo
  const [modelo, setModelo] = useState('');
  const [color, setColor] = useState('');
  const [placa, setPlaca] = useState('');

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
    // Aquí luego integramos el QR real con plugin
    setMensaje('Escaneo de QR todavía no implementado (pendiente).');
  };

  const limpiarCampos = () => {
    setNombre('');
    setNoEmpleado('');
    setEmpresa('');
    setBodega('');
    setAsunto('');
    setModelo('');
    setColor('');
    setPlaca('');
  };

  const validar = (): string | null => {
    if (!nombre.trim()) return 'El nombre es obligatorio.';
    if (!bodega.trim()) return 'La bodega es obligatoria.';
    if (!asunto.trim()) return 'El asunto es obligatorio.';

    if (categoria === 'EMPLEADO' && !noEmpleado.trim()) {
      return 'El número de empleado es obligatorio para empleados.';
    }

    if (tipoEntidad === 'VEHICULO') {
      if (!placa.trim()) return 'Las placas del vehículo son obligatorias.';
    }

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
        ? 'QR_PENDIENTE' // luego se reemplaza con el valor real del QR escaneado
        : null;

    await sqliteService.insertarRegistro({
      tipo: tipoRegistro,
      tipoEntidad,
      categoria,

      // ya no pedimos ID visibles, solo nombre / datos reales
      idPeaton: null, // lo puedes usar después como ID interno si quieres
      nombre: nombre.trim() || null,
      noEmpleado: noEmpleado.trim() || null,
      empresa: empresa.trim() || null,
      bodega: bodega.trim() || null,
      asunto: asunto.trim() || null,

      idVehiculo: null, // igual, interno si lo necesitas después
      modelo:
        tipoEntidad === 'VEHICULO' ? modelo.trim() || null : null,
      color:
        tipoEntidad === 'VEHICULO' ? color.trim() || null : null,
      placa:
        tipoEntidad === 'VEHICULO'
          ? placa.trim().toUpperCase()
          : null,
      fotoPlacasPath: null, // luego con cámara

      qrContenido,
      dispositivoId: DISPOSITIVO_ID,
    });

    await actualizarPendientes();
    limpiarCampos();
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

  // Autollenar cuando se escriben placas y ya existe movimiento hoy
  const autollenarPorPlaca = async (valor: string) => {
    const limpia = valor.trim().toUpperCase();
    if (!limpia) return;

    const ultimo = await sqliteService.buscarUltimoPorPlacaHoy(limpia);
    if (!ultimo) {
      // No decimos error, solo no hay datos anteriores
      return;
    }

    // Rellenar datos desde el último registro
    setNombre(ultimo.nombre ?? '');
    setNoEmpleado(ultimo.noEmpleado ?? '');
    setEmpresa(ultimo.empresa ?? '');
    setBodega(ultimo.bodega ?? '');
    setAsunto(ultimo.asunto ?? '');
    setModelo(ultimo.modelo ?? '');
    setColor(ultimo.color ?? '');

    setCategoria(ultimo.categoria);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle style={{ fontSize: '1.2rem', fontWeight: 700 }}>
            CONTROL DE ACCESOS
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {/* Tarjeta de selección de tipo */}
        <IonCard>
          <IonCardHeader>
            <IonCardTitle style={{ fontSize: '1.1rem' }}>
              Tipo de movimiento
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonList>
              <IonItem>
                <IonSegment
                  value={tipoRegistro}
                  onIonChange={(e) => {
                    setTipoRegistro(e.detail.value as TipoRegistro);
                    // no limpiamos todo aquí para no perder datos al cambiar de ENTRADA a SALIDA
                  }}
                >
                  <IonSegmentButton value="ENTRADA">
                    <IonLabel style={{ fontSize: '0.9rem' }}>
                      ENTRADA
                    </IonLabel>
                  </IonSegmentButton>
                  <IonSegmentButton value="SALIDA">
                    <IonLabel style={{ fontSize: '0.9rem' }}>
                      SALIDA
                    </IonLabel>
                  </IonSegmentButton>
                </IonSegment>
              </IonItem>

              <IonItem>
                <IonLabel>Tipo</IonLabel>
              </IonItem>
              <IonItem>
                <IonSegment
                  value={tipoEntidad}
                  onIonChange={(e) => {
                    setTipoEntidad(e.detail.value as TipoEntidad);
                    limpiarCampos(); // al cambiar peaton/vehículo limpiamos formulario
                  }}
                >
                  <IonSegmentButton value="PEATON">
                    <IonLabel style={{ fontSize: '0.9rem' }}>
                      PEATÓN
                    </IonLabel>
                  </IonSegmentButton>
                  <IonSegmentButton value="VEHICULO">
                    <IonLabel style={{ fontSize: '0.9rem' }}>
                      VEHÍCULO
                    </IonLabel>
                  </IonSegmentButton>
                </IonSegment>
              </IonItem>

              <IonItem>
                <IonLabel>Categoría</IonLabel>
              </IonItem>
              <IonItem>
                <IonSegment
                  value={categoria}
                  onIonChange={(e) => {
                    setCategoria(e.detail.value as CategoriaPersona);
                    limpiarCampos(); // al cambiar entre empleado/proveedor/visitante limpiamos datos
                  }}
                >
                  <IonSegmentButton value="EMPLEADO">
                    <IonLabel style={{ fontSize: '0.9rem' }}>
                      EMPLEADO
                    </IonLabel>
                  </IonSegmentButton>
                  <IonSegmentButton value="PROVEEDOR">
                    <IonLabel style={{ fontSize: '0.9rem' }}>
                      PROVEEDOR
                    </IonLabel>
                  </IonSegmentButton>
                  <IonSegmentButton value="VISITANTE">
                    <IonLabel style={{ fontSize: '0.9rem' }}>
                      VISITANTE
                    </IonLabel>
                  </IonSegmentButton>
                </IonSegment>
              </IonItem>

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
                    <IonLabel style={{ fontSize: '0.9rem' }}>QR</IonLabel>
                  </IonSegmentButton>
                  <IonSegmentButton value="MANUAL">
                    <IonLabel style={{ fontSize: '0.9rem' }}>
                      MANUAL
                    </IonLabel>
                  </IonSegmentButton>
                </IonSegment>
              </IonItem>

              {modoCaptura === 'QR' && (
                <IonItem lines="none">
                  <IonButton
                    expand="block"
                    size="large"
                    onClick={manejarScanQR}
                  >
                    ESCANEAR QR ({etiquetaEntidad})
                  </IonButton>
                </IonItem>
              )}
            </IonList>
          </IonCardContent>
        </IonCard>

        {/* Tarjeta de datos principales */}
        <IonCard>
          <IonCardHeader>
            <IonCardTitle style={{ fontSize: '1.1rem' }}>
              Datos de {etiquetaEntidad.toUpperCase()}
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonList>
              {/* Nombre siempre visible (peatón o vehículo) */}
              <IonItem>
                <IonLabel position="stacked">
                  Nombre (persona / conductor)
                </IonLabel>
                <IonInput
                  style={{ fontSize: '1rem' }}
                  value={nombre}
                  onIonChange={(e) => setNombre(e.detail.value ?? '')}
                  placeholder="Ej. Juan Pérez"
                />
              </IonItem>

              {/* No. empleado opcional, obligatorio solo para categoría EMPLEADO */}
              <IonItem>
                <IonLabel position="stacked">No. Empleado</IonLabel>
                <IonInput
                  style={{ fontSize: '1rem' }}
                  value={noEmpleado}
                  onIonChange={(e) => setNoEmpleado(e.detail.value ?? '')}
                  placeholder="Solo si aplica"
                />
              </IonItem>

              {tipoEntidad === 'VEHICULO' && (
                <>
                  <IonItem>
                    <IonLabel position="stacked">Placas</IonLabel>
                    <IonInput
                      style={{ fontSize: '1rem' }}
                      value={placa}
                      onIonChange={(e) => {
                        const val = e.detail.value ?? '';
                        setPlaca(val);
                      }}
                      onIonBlur={async () => {
                        // al salir del campo placas, intentamos autollenar
                        await autollenarPorPlaca(placa);
                      }}
                      placeholder="Ej. ABC-1234"
                    />
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">Modelo</IonLabel>
                    <IonInput
                      style={{ fontSize: '1rem' }}
                      value={modelo}
                      onIonChange={(e) =>
                        setModelo(e.detail.value ?? '')
                      }
                      placeholder="Modelo del vehículo"
                    />
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">Color</IonLabel>
                    <IonInput
                      style={{ fontSize: '1rem' }}
                      value={color}
                      onIonChange={(e) =>
                        setColor(e.detail.value ?? '')
                      }
                      placeholder="Color del vehículo"
                    />
                  </IonItem>
                </>
              )}

              {/* Campos comunes */}
              <IonItem>
                <IonLabel position="stacked">Empresa</IonLabel>
                <IonInput
                  style={{ fontSize: '1rem' }}
                  value={empresa}
                  onIonChange={(e) => setEmpresa(e.detail.value ?? '')}
                  placeholder="Impulso, EXPEDITORS, otra..."
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Bodega</IonLabel>
                <IonInput
                  style={{ fontSize: '1rem' }}
                  value={bodega}
                  onIonChange={(e) => setBodega(e.detail.value ?? '')}
                  placeholder="Ej. Bodega 1, Almacén A..."
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Asunto</IonLabel>
                <IonInput
                  style={{ fontSize: '1rem' }}
                  value={asunto}
                  onIonChange={(e) => setAsunto(e.detail.value ?? '')}
                  placeholder="Motivo de la visita / movimiento"
                />
              </IonItem>
            </IonList>
          </IonCardContent>
        </IonCard>

        {/* Botones grandes para guardias */}
        <IonButton
          expand="block"
          size="large"
          onClick={guardarRegistro}
        >
          GUARDAR REGISTRO OFFLINE
        </IonButton>

        <IonButton
          expand="block"
          size="large"
          fill="outline"
          onClick={sincronizarAhora}
        >
          SINCRONIZAR AHORA
        </IonButton>

        {/* Estado */}
        <p style={{ marginTop: 16, fontSize: '1rem' }}>
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
