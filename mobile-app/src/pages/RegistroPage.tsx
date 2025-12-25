// src/pages/RegistroPage.tsx

import React, { useEffect, useState, useMemo } from 'react';
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
  IonChip,
  IonGrid,
  IonRow,
  IonCol,
  IonIcon,
} from '@ionic/react';
import {
  logInOutline,
  logOutOutline,
  walkOutline,
  carOutline,
  syncOutline,
  saveOutline,
  searchOutline,
  closeCircleOutline,
} from 'ionicons/icons';
import { Camera, CameraResultType } from '@capacitor/camera';
import { sqliteService } from '../services/sqliteService';
import { syncService } from '../services/syncService';
import {
  TipoRegistro,
  TipoEntidad,
  CategoriaPersona,
  RegistroLocal,
} from '../models/registro';

const DISPOSITIVO_ID = 'tablet-puerta-1';

type ModoCaptura = 'QR' | 'MANUAL';
type SelectorModo = 'ADENTRO' | 'HISTORICO' | null;

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

  // Foto de placas
  const [fotoPlacasPath, setFotoPlacasPath] = useState<string | null>(null);

  // Selector de empleados (adentro o histórico)
  const [empleadosLista, setEmpleadosLista] = useState<RegistroLocal[]>([]);
  const [showSelectorEmpleado, setShowSelectorEmpleado] = useState(false);
  const [selectorModo, setSelectorModo] = useState<SelectorModo>(null);
  const [filtroEmpleado, setFiltroEmpleado] = useState('');

  const actualizarPendientes = async () => {
    const regs = await sqliteService.obtenerPendientes();
    setPendientes(regs.length);
  };

  useEffect(() => {
    (async () => {
      try {
        await actualizarPendientes();
        await syncService.registrarAutoSync();
      } catch (err) {
        console.error('Error en inicialización de RegistroPage:', err);
        setSyncStatus(
          'Error al inicializar sincronización en este dispositivo.'
        );
      }
    })();
  }, []);

  // === FOTO DE PLACAS ===
  const tomarFotoPlacas = async () => {
    try {
      const photo = await Camera.getPhoto({
        quality: 70,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        saveToGallery: false,
      });

      const path = photo.webPath || photo.path || null;

      if (!path) {
        setMensaje('No se pudo obtener la foto de las placas.');
        return;
      }

      setFotoPlacasPath(path);
      setMensaje('Foto de placas capturada.');
    } catch (err) {
      console.error('Error capturando foto de placas:', err);
      setMensaje('No se tomó ninguna foto.');
    }
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
    setFotoPlacasPath(null);
  };

  // === VALIDACIONES BASE ===
  const validarDatosRequeridos = (): string | null => {
    if (tipoRegistro === 'ENTRADA') {
      if (!nombre.trim()) return 'El nombre es obligatorio.';
      if (!bodega.trim()) return 'La bodega es obligatoria.';
      if (!asunto.trim()) return 'El asunto es obligatorio.';

      if (categoria === 'EMPLEADO' && !noEmpleado.trim()) {
        return 'El número de empleado es obligatorio para empleados.';
      }

      if (tipoEntidad === 'VEHICULO') {
        if (!placa.trim()) return 'Las placas del vehículo son obligatorias.';
        if (!fotoPlacasPath) {
          return 'Debe tomar foto de las placas para registrar la ENTRADA.';
        }
      }

      return null;
    } else {
      if (tipoEntidad === 'VEHICULO') {
        if (!placa.trim()) {
          return 'Para registrar una salida de vehículo, ingrese las placas.';
        }
        if (!fotoPlacasPath) {
          return 'Debe tomar foto de las placas para registrar la SALIDA.';
        }
        return null;
      }

      if (categoria === 'EMPLEADO') {
        if (!noEmpleado.trim()) {
          return 'Para registrar una salida de empleado, ingrese el No. de empleado.';
        }
        return null;
      }

      if (!nombre.trim() || !empresa.trim() || !bodega.trim()) {
        return 'Para registrar una salida de proveedor/visitante, ingrese nombre, empresa y bodega.';
      }

      return null;
    }
  };

  const validarEntrada = async (): Promise<string | null> => {
    // PEATÓN EMPLEADO: prevenir doble ENTRADA
    if (tipoEntidad === 'PEATON' && categoria === 'EMPLEADO') {
      const clave = noEmpleado.trim().toUpperCase();
      if (!clave) return 'El número de empleado es obligatorio.';

      const ultimo = await sqliteService.buscarUltimoPorNoEmpleadoHoy(clave);
      const nombreUpper = nombre.trim().toUpperCase();

      if (ultimo && ultimo.tipo === 'ENTRADA') {
        if (!ultimo.nombre || ultimo.nombre === nombreUpper) {
          return 'Este empleado ya tiene una ENTRADA registrada y no ha salido.';
        }
      }
      return null;
    }

    // VEHÍCULO: prevenir doble ENTRADA
    if (tipoEntidad === 'VEHICULO') {
      const placaUpper = placa.trim().toUpperCase();
      if (!placaUpper) {
        return 'Las placas son obligatorias para la ENTRADA de vehículo.';
      }

      const ultimo = await sqliteService.buscarUltimoPorPlacaHoy(placaUpper);
      if (ultimo && ultimo.tipo === 'ENTRADA') {
        return 'Este vehículo ya tiene una ENTRADA registrada y no ha salido.';
      }
      return null;
    }

    return null;
  };

  const prepararSalida = async (): Promise<void> => {
    try {
      // VEHÍCULO: rellenar datos desde la última ENTRADA si existe
      if (tipoEntidad === 'VEHICULO') {
        const placaUpper = placa.trim().toUpperCase();
        if (!placaUpper) return;

        const ultimo = await sqliteService.buscarUltimoPorPlacaHoy(placaUpper);
        if (!ultimo || ultimo.tipo !== 'ENTRADA') {
          setMensaje(
            'No se encontró ENTRADA previa para estas placas. Se guardará SALIDA sin registro de ENTRADA.'
          );
          return;
        }

        setNombre((ultimo.nombre ?? '').toUpperCase());
        setNoEmpleado((ultimo.noEmpleado ?? '').toUpperCase());
        setEmpresa((ultimo.empresa ?? '').toUpperCase());
        setBodega((ultimo.bodega ?? '').toUpperCase());
        setAsunto((ultimo.asunto ?? '').toUpperCase());
        setModelo((ultimo.modelo ?? '').toUpperCase());
        setColor((ultimo.color ?? '').toUpperCase());
        return;
      }

      // EMPLEADO PEATÓN: rellenar datos desde la última ENTRADA
      if (categoria === 'EMPLEADO') {
        const clave = noEmpleado.trim().toUpperCase();
        if (!clave) return;

        const ultimo = await sqliteService.buscarUltimoPorNoEmpleadoHoy(clave);
        if (!ultimo || ultimo.tipo !== 'ENTRADA') {
          setMensaje(
            'No se encontró ENTRADA previa para este empleado. Se guardará SALIDA sin registro de ENTRADA.'
          );
          return;
        }

        setNombre((ultimo.nombre ?? '').toUpperCase());
        setEmpresa((ultimo.empresa ?? '').toUpperCase());
        setBodega((ultimo.bodega ?? '').toUpperCase());
        setAsunto((ultimo.asunto ?? '').toUpperCase());
        return;
      }

      // PROVEEDOR / VISITANTE PEATÓN
      const n = nombre.trim().toUpperCase();
      const e = empresa.trim().toUpperCase();
      const b = bodega.trim().toUpperCase();
      if (!n || !e || !b) return;

      const ultimo = await sqliteService.buscarUltimoPorPersonaHoy(n, e, b);
      if (!ultimo || ultimo.tipo !== 'ENTRADA') {
        setMensaje(
          'No se encontró ENTRADA previa para esta persona. Se guardará SALIDA sin registro de ENTRADA.'
        );
        return;
      }

      setAsunto((ultimo.asunto ?? '').toUpperCase());
    } catch (err) {
      console.error('Error preparando salida:', err);
    }
  };

  // === QR: procesar contenido ===
  const procesarQR = async (contenido: string) => {
    try {
      const limpio = contenido.trim();
      if (!limpio) {
        setMensaje('QR vacío o ilegible.');
        return;
      }

      const partes = limpio.split('|');
      if (partes.length < 5) {
        setMensaje('Formato de QR no reconocido.');
        return;
      }

      const sistema = partes[0]?.toUpperCase();
      const version = partes[1]?.trim();
      const tipoQR = partes[2]?.toUpperCase();

      if (sistema !== 'IMPULSO' || version !== '1') {
        setMensaje('QR no pertenece al sistema IMPULSO o versión inválida.');
        return;
      }

      // Empleado PEATÓN: IMPULSO|1|E|NO_EMP|NOMBRE
      if (tipoQR === 'E') {
        const noEmp = (partes[3] ?? '').trim().toUpperCase();
        const nom = (partes[4] ?? '').trim().toUpperCase();

        if (!noEmp || !nom) {
          setMensaje('QR de empleado incompleto (faltan datos).');
          return;
        }

        setTipoEntidad('PEATON');
        setCategoria('EMPLEADO');
        setNoEmpleado(noEmp);
        setNombre(nom);

        // autollenar por empleado
        await autollenarPorNoEmpleado(noEmp);

        setMensaje('Datos de empleado cargados desde QR. Revise y guarde.');
        return;
      }

      // Empleado en vehículo: IMPULSO|1|V|NO_EMP|NOMBRE|PLACAS
      if (tipoQR === 'V') {
        if (partes.length < 6) {
          setMensaje('QR de vehículo incompleto (faltan placas).');
          return;
        }

        const noEmp = (partes[3] ?? '').trim().toUpperCase();
        const nom = (partes[4] ?? '').trim().toUpperCase();
        const placasQR = (partes[5] ?? '').trim().toUpperCase();

        if (!noEmp || !nom || !placasQR) {
          setMensaje('QR de vehículo incompleto (empleado/nombre/placas).');
          return;
        }

        setTipoEntidad('VEHICULO');
        setCategoria('EMPLEADO');
        setNoEmpleado(noEmp);
        setNombre(nom);
        setPlaca(placasQR);

        await autollenarPorPlaca(placasQR);

        setMensaje('Datos de vehículo cargados desde QR. Revise y guarde.');
        return;
      }

      setMensaje('Tipo de QR desconocido. Use solo QR de empleado o vehículo.');
    } catch (err) {
      console.error('Error procesando QR:', err);
      setMensaje('Error al procesar el código QR.');
    }
  };

  // === QR: "escaneo" temporal usando prompt ===
  const manejarScanQR = async () => {
    try {
      const simulado = window.prompt(
        'Lectura de QR (temporal): pega o escribe el contenido del QR'
      );
      if (simulado) {
        await procesarQR(simulado);
      } else {
        setMensaje('No se proporcionó contenido de QR.');
      }
    } catch (err) {
      console.error('Error procesando QR simulado:', err);
      setMensaje('Error al procesar el código QR.');
    }
  };

  const guardarRegistro = async () => {
    const nombreUpper = nombre.trim().toUpperCase();
    const noEmpleadoUpper = noEmpleado.trim().toUpperCase();
    const empresaUpper = empresa.trim().toUpperCase();
    const bodegaUpper = bodega.trim().toUpperCase();
    const asuntoUpper = asunto.trim().toUpperCase();
    const placaUpper = placa.trim().toUpperCase();
    const modeloUpper = modelo.trim().toUpperCase();
    const colorUpper = color.trim().toUpperCase();

    setNombre(nombreUpper);
    setNoEmpleado(noEmpleadoUpper);
    setEmpresa(empresaUpper);
    setBodega(bodegaUpper);
    setAsunto(asuntoUpper);
    setPlaca(placaUpper);
    setModelo(modeloUpper);
    setColor(colorUpper);

    const errorBasico = validarDatosRequeridos();
    if (errorBasico) {
      setMensaje(errorBasico);
      return;
    }

    if (tipoRegistro === 'ENTRADA') {
      const errorEntrada = await validarEntrada();
      if (errorEntrada) {
        setMensaje(errorEntrada);
        return;
      }
    } else {
      await prepararSalida();
    }

    const qrContenido = modoCaptura === 'QR' ? null : null;

    await sqliteService.insertarRegistro({
      tipo: tipoRegistro,
      tipoEntidad,
      categoria,

      idPeaton: null,
      nombre: nombreUpper || null,
      noEmpleado: noEmpleadoUpper || null,
      empresa: empresaUpper || null,
      bodega: bodegaUpper || null,
      asunto: asuntoUpper || null,

      idVehiculo: null,
      modelo:
        tipoEntidad === 'VEHICULO' ? modeloUpper || null : null,
      color:
        tipoEntidad === 'VEHICULO' ? colorUpper || null : null,
      placa:
        tipoEntidad === 'VEHICULO'
          ? placaUpper || null
          : null,
      fotoPlacasPath:
        tipoEntidad === 'VEHICULO' ? fotoPlacasPath ?? null : null,

      qrContenido: qrContenido,
      dispositivoId: DISPOSITIVO_ID,
    });

    await actualizarPendientes();
    limpiarCampos();
    setMensaje(
      tipoRegistro === 'ENTRADA'
        ? 'ENTRADA guardada localmente (offline).'
        : 'SALIDA guardada localmente (offline).'
    );
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

  const autollenarPorPlaca = async (valor: string) => {
    const limpia = valor.trim().toUpperCase();
    if (!limpia) return;

    const ultimo = await sqliteService.buscarUltimoPorPlacaHoy(limpia);
    if (!ultimo) {
      return;
    }

    setNombre((ultimo.nombre ?? '').toUpperCase());
    setNoEmpleado((ultimo.noEmpleado ?? '').toUpperCase());
    setEmpresa((ultimo.empresa ?? '').toUpperCase());
    setBodega((ultimo.bodega ?? '').toUpperCase());
    setAsunto((ultimo.asunto ?? '').toUpperCase());
    setModelo((ultimo.modelo ?? '').toUpperCase());
    setColor((ultimo.color ?? '').toUpperCase());
    setCategoria(ultimo.categoria);
  };

  const autollenarPorNoEmpleado = async (valor: string) => {
    const limpio = valor.trim().toUpperCase();
    if (!limpio) return;

    const ultimo = await sqliteService.buscarUltimoPorNoEmpleadoHoy(limpio);
    if (!ultimo) return;

    setNombre((ultimo.nombre ?? '').toUpperCase());
    setEmpresa((ultimo.empresa ?? '').toUpperCase());
    setBodega((ultimo.bodega ?? '').toUpperCase());
    setAsunto((ultimo.asunto ?? '').toUpperCase());
  };

  const autollenarPorPersona = async () => {
    const n = nombre.trim().toUpperCase();
    const e = empresa.trim().toUpperCase();
    const b = bodega.trim().toUpperCase();

    if (!n || !e || !b) return;

    const ultimo = await sqliteService.buscarUltimoPorPersonaHoy(n, e, b);
    if (!ultimo) return;

    setAsunto((ultimo.asunto ?? '').toUpperCase());
  };

  // === SELECTOR EMPLEADOS ADENTRO ===
  const abrirSelectorEmpleadoDentro = async () => {
    try {
      const todos = await sqliteService.obtenerRegistrosOrdenadosPorFechaDesc();
      const mapa = new Map<string, RegistroLocal>();

      for (const reg of todos) {
        const clave = (reg.noEmpleado ?? '').trim().toUpperCase();
        if (!clave) continue;
        if (reg.categoria !== 'EMPLEADO') continue;
        if (reg.tipoEntidad !== 'PEATON') continue;
        if (!mapa.has(clave)) {
          mapa.set(clave, reg);
        }
      }

      const lista = Array.from(mapa.values()).filter(
        (r) => r.tipo === 'ENTRADA'
      );

      if (!lista.length) {
        setMensaje('No hay empleados adentro actualmente.');
        return;
      }

      setEmpleadosLista(lista);
      setFiltroEmpleado('');
      setSelectorModo('ADENTRO');
      setShowSelectorEmpleado(true);
    } catch (err) {
      console.error('Error cargando empleados adentro:', err);
      setMensaje('No se pudo cargar la lista de empleados adentro.');
    }
  };

  // === SELECTOR EMPLEADOS HISTÓRICO ===
  const abrirSelectorEmpleadoHistorico = async () => {
    try {
      const todos = await sqliteService.obtenerRegistrosOrdenadosPorFechaDesc();
      const mapa = new Map<string, RegistroLocal>();

      for (const reg of todos) {
        const clave = (reg.noEmpleado ?? '').trim().toUpperCase();
        if (!clave) continue;
        if (reg.categoria !== 'EMPLEADO') continue;
        if (reg.tipoEntidad !== 'PEATON') continue;
        if (!mapa.has(clave)) {
          mapa.set(clave, reg);
        }
      }

      const lista = Array.from(mapa.values());

      if (!lista.length) {
        setMensaje('No hay empleados registrados todavía.');
        return;
      }

      setEmpleadosLista(lista);
      setFiltroEmpleado('');
      setSelectorModo('HISTORICO');
      setShowSelectorEmpleado(true);
    } catch (err) {
      console.error('Error cargando empleados históricos:', err);
      setMensaje('No se pudo cargar la lista de empleados registrados.');
    }
  };

  const cerrarSelector = () => {
    setShowSelectorEmpleado(false);
    setSelectorModo(null);
    setFiltroEmpleado('');
  };

  const seleccionarEmpleado = (sel: RegistroLocal) => {
    setNoEmpleado((sel.noEmpleado ?? '').toUpperCase());
    setNombre((sel.nombre ?? '').toUpperCase());
    setEmpresa((sel.empresa ?? '').toUpperCase());
    setBodega((sel.bodega ?? '').toUpperCase());
    setAsunto((sel.asunto ?? '').toUpperCase());
    cerrarSelector();
  };

  const empleadosFiltrados = useMemo(() => {
    const term = filtroEmpleado.trim().toUpperCase();
    if (!term) return empleadosLista;
    return empleadosLista.filter((e) => {
      const noEmp = (e.noEmpleado ?? '').toUpperCase();
      const nom = (e.nombre ?? '').toUpperCase();
      return noEmp.includes(term) || nom.includes(term);
    });
  }, [filtroEmpleado, empleadosLista]);

  const iconoMovimiento =
    tipoRegistro === 'ENTRADA' ? logInOutline : logOutOutline;
  const colorMovimiento = tipoRegistro === 'ENTRADA' ? 'success' : 'danger';

  const mostrarBotonSelectorAdentro =
    tipoRegistro === 'SALIDA' &&
    tipoEntidad === 'PEATON' &&
    categoria === 'EMPLEADO';

  const mostrarBotonSelectorHistorico =
    tipoRegistro === 'ENTRADA' &&
    tipoEntidad === 'PEATON' &&
    categoria === 'EMPLEADO';

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle
            style={{
              fontSize: '1.2rem',
              fontWeight: 700,
              textAlign: 'center',
            }}
          >
            CONTROL DE ACCESOS
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonGrid fixed>
          <IonRow>
            <IonCol size="12">
              <IonCard>
                <IonCardContent
                  style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                >
                  <IonChip
                    color={colorMovimiento}
                    style={{ fontSize: '1rem', padding: '0.4rem 0.8rem' }}
                  >
                    <IonIcon
                      icon={iconoMovimiento}
                      style={{ marginRight: 4 }}
                    />
                    <IonLabel style={{ fontWeight: 700 }}>
                      {tipoRegistro === 'ENTRADA'
                        ? 'REGISTRANDO ENTRADA'
                        : 'REGISTRANDO SALIDA'}
                    </IonLabel>
                  </IonChip>

                  <IonText>
                    <p style={{ margin: 0, fontSize: '0.95rem' }}>
                      <strong>Tipo:</strong> {etiquetaEntidad.toUpperCase()}{' '}
                      &nbsp;|&nbsp;
                      <strong>Categoría:</strong> {categoria}
                    </p>
                  </IonText>

                  <IonText color="medium">
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>
                      Revise bien antes de guardar. Este registro se guarda{' '}
                      <strong>offline</strong>.
                    </p>
                  </IonText>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          {/* Configuración */}
          <IonRow>
            <IonCol size="12">
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle style={{ fontSize: '1.05rem' }}>
                    Configuración del movimiento
                  </IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonList>
                    <IonItem lines="none">
                      <IonLabel
                        position="stacked"
                        style={{ fontSize: '0.9rem', fontWeight: 600 }}
                      >
                        Tipo de movimiento
                      </IonLabel>
                      <IonSegment
                        value={tipoRegistro}
                        onIonChange={(e) => {
                          setTipoRegistro(e.detail.value as TipoRegistro);
                        }}
                      >
                        <IonSegmentButton value="ENTRADA">
                          <IonLabel style={{ fontSize: '0.85rem' }}>
                            <IonIcon
                              icon={logInOutline}
                              style={{ marginRight: 4 }}
                            />
                            ENTRADA
                          </IonLabel>
                        </IonSegmentButton>
                        <IonSegmentButton value="SALIDA">
                          <IonLabel style={{ fontSize: '0.85rem' }}>
                            <IonIcon
                              icon={logOutOutline}
                              style={{ marginRight: 4 }}
                            />
                            SALIDA
                          </IonLabel>
                        </IonSegmentButton>
                      </IonSegment>
                    </IonItem>

                    <IonItem lines="none" style={{ marginTop: 8 }}>
                      <IonLabel
                        position="stacked"
                        style={{ fontSize: '0.9rem', fontWeight: 600 }}
                      >
                        Tipo
                      </IonLabel>
                      <IonSegment
                        value={tipoEntidad}
                        onIonChange={(e) => {
                          setTipoEntidad(e.detail.value as TipoEntidad);
                          limpiarCampos();
                        }}
                      >
                        <IonSegmentButton value="PEATON">
                          <IonLabel style={{ fontSize: '0.85rem' }}>
                            <IonIcon
                              icon={walkOutline}
                              style={{ marginRight: 4 }}
                            />
                            PEATÓN
                          </IonLabel>
                        </IonSegmentButton>
                        <IonSegmentButton value="VEHICULO">
                          <IonLabel style={{ fontSize: '0.85rem' }}>
                            <IonIcon
                              icon={carOutline}
                              style={{ marginRight: 4 }}
                            />
                            VEHÍCULO
                          </IonLabel>
                        </IonSegmentButton>
                      </IonSegment>
                    </IonItem>

                    <IonItem lines="none" style={{ marginTop: 8 }}>
                      <IonLabel
                        position="stacked"
                        style={{ fontSize: '0.9rem', fontWeight: 600 }}
                      >
                        Categoría
                      </IonLabel>
                      <IonSegment
                        value={categoria}
                        onIonChange={(e) => {
                          setCategoria(e.detail.value as CategoriaPersona);
                          limpiarCampos();
                        }}
                      >
                        <IonSegmentButton value="EMPLEADO">
                          <IonLabel style={{ fontSize: '0.8rem' }}>
                            EMPLEADO
                          </IonLabel>
                        </IonSegmentButton>
                        <IonSegmentButton value="PROVEEDOR">
                          <IonLabel style={{ fontSize: '0.8rem' }}>
                            PROVEEDOR
                          </IonLabel>
                        </IonSegmentButton>
                        <IonSegmentButton value="VISITANTE">
                          <IonLabel style={{ fontSize: '0.8rem' }}>
                            VISITANTE
                          </IonLabel>
                        </IonSegmentButton>
                      </IonSegment>
                    </IonItem>

                    <IonItem lines="none" style={{ marginTop: 8 }}>
                      <IonLabel
                        position="stacked"
                        style={{ fontSize: '0.9rem', fontWeight: 600 }}
                      >
                        Modo de captura
                      </IonLabel>
                      <IonSegment
                        value={modoCaptura}
                        onIonChange={(e) =>
                          setModoCaptura(e.detail.value as ModoCaptura)
                        }
                      >
                        <IonSegmentButton value="QR">
                          <IonLabel style={{ fontSize: '0.8rem' }}>
                            QR
                          </IonLabel>
                        </IonSegmentButton>
                        <IonSegmentButton value="MANUAL">
                          <IonLabel style={{ fontSize: '0.8rem' }}>
                            MANUAL
                          </IonLabel>
                        </IonSegmentButton>
                      </IonSegment>
                    </IonItem>

                    {modoCaptura === 'QR' && (
                      <IonItem lines="none" style={{ marginTop: 8 }}>
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
            </IonCol>
          </IonRow>

          {/* Datos */}
          <IonRow>
            <IonCol size="12">
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle style={{ fontSize: '1.05rem' }}>
                    Datos de {etiquetaEntidad.toUpperCase()}
                  </IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonList>
                    <IonItem>
                      <IonLabel position="stacked">
                        NOMBRE (PERSONA / CONDUCTOR){' '}
                        <IonText color="danger">*</IonText>
                      </IonLabel>
                      <IonInput
                        style={{ fontSize: '1rem' }}
                        value={nombre}
                        onIonChange={(e) =>
                          setNombre((e.detail.value ?? '').toUpperCase())
                        }
                        placeholder="EJ. JUAN PÉREZ"
                      />
                    </IonItem>

                    {categoria === 'EMPLEADO' && (
                      <>
                        <IonItem>
                          <IonLabel position="stacked">
                            NO. EMPLEADO{' '}
                            <IonText color="danger">*</IonText>
                          </IonLabel>
                          <IonInput
                            style={{ fontSize: '1rem' }}
                            value={noEmpleado}
                            onIonChange={(e) =>
                              setNoEmpleado(
                                (e.detail.value ?? '').toUpperCase()
                              )
                            }
                            onIonBlur={async () => {
                              await autollenarPorNoEmpleado(noEmpleado);
                            }}
                            placeholder="NÚMERO DE NÓMINA"
                          />
                        </IonItem>

                        {mostrarBotonSelectorHistorico && (
                          <IonItem lines="none">
                            <IonButton
                              expand="block"
                              fill="outline"
                              onClick={abrirSelectorEmpleadoHistorico}
                              style={{ marginTop: 8 }}
                            >
                              <IonIcon
                                icon={searchOutline}
                                style={{ marginRight: 6 }}
                              />
                              BUSCAR EMPLEADO REGISTRADO
                            </IonButton>
                          </IonItem>
                        )}

                        {mostrarBotonSelectorAdentro && (
                          <IonItem lines="none">
                            <IonButton
                              expand="block"
                              fill="outline"
                              onClick={abrirSelectorEmpleadoDentro}
                              style={{ marginTop: 8 }}
                            >
                              <IonIcon
                                icon={searchOutline}
                                style={{ marginRight: 6 }}
                              />
                              SELECCIONAR EMPLEADO ADENTRO
                            </IonButton>
                          </IonItem>
                        )}
                      </>
                    )}

                    {tipoEntidad === 'VEHICULO' && (
                      <>
                        <IonItem>
                          <IonLabel position="stacked">
                            PLACAS <IonText color="danger">*</IonText>
                          </IonLabel>
                          <IonInput
                            style={{ fontSize: '1rem' }}
                            value={placa}
                            onIonChange={(e) => {
                              const val = (e.detail.value ?? '').toUpperCase();
                              setPlaca(val);
                            }}
                            onIonBlur={async () => {
                              await autollenarPorPlaca(placa);
                            }}
                            placeholder="EJ. ABC-1234"
                          />
                        </IonItem>

                        <IonItem lines="none">
                          <IonButton
                            expand="block"
                            onClick={tomarFotoPlacas}
                            style={{ marginTop: 8, marginBottom: 8 }}
                          >
                            TOMAR FOTO DE PLACAS
                          </IonButton>
                        </IonItem>

                        {fotoPlacasPath && (
                          <IonItem lines="none">
                            <IonLabel position="stacked">
                              VISTA PREVIA DE PLACAS
                            </IonLabel>
                            <img
                              src={fotoPlacasPath}
                              alt="Foto de placas"
                              style={{
                                marginTop: 8,
                                maxWidth: '100%',
                                borderRadius: 8,
                                border: '1px solid #ccc',
                              }}
                            />
                          </IonItem>
                        )}

                        <IonItem>
                          <IonLabel position="stacked">MODELO</IonLabel>
                          <IonInput
                            style={{ fontSize: '1rem' }}
                            value={modelo}
                            onIonChange={(e) =>
                              setModelo(
                                (e.detail.value ?? '').toUpperCase()
                              )
                            }
                            placeholder="MODELO DEL VEHÍCULO"
                          />
                        </IonItem>
                        <IonItem>
                          <IonLabel position="stacked">COLOR</IonLabel>
                          <IonInput
                            style={{ fontSize: '1rem' }}
                            value={color}
                            onIonChange={(e) =>
                              setColor((e.detail.value ?? '').toUpperCase())
                            }
                            placeholder="COLOR DEL VEHÍCULO"
                          />
                        </IonItem>
                      </>
                    )}

                    <IonItem>
                      <IonLabel position="stacked">
                        EMPRESA <IonText color="danger">*</IonText>
                      </IonLabel>
                      <IonInput
                        style={{ fontSize: '1rem' }}
                        value={empresa}
                        onIonChange={(e) =>
                          setEmpresa((e.detail.value ?? '').toUpperCase())
                        }
                        placeholder="IMPULSO, EXPEDITORS, OTRA..."
                      />
                    </IonItem>
                    <IonItem>
                      <IonLabel position="stacked">
                        BODEGA <IonText color="danger">*</IonText>
                      </IonLabel>
                      <IonInput
                        style={{ fontSize: '1rem' }}
                        value={bodega}
                        onIonChange={(e) =>
                          setBodega((e.detail.value ?? '').toUpperCase())
                        }
                        onIonBlur={async () => {
                          if (categoria !== 'EMPLEADO') {
                            await autollenarPorPersona();
                          }
                        }}
                        placeholder="EJ. BODEGA 1, ALMACÉN A..."
                      />
                    </IonItem>
                    <IonItem>
                      <IonLabel position="stacked">
                        ASUNTO <IonText color="danger">*</IonText>
                      </IonLabel>
                      <IonInput
                        style={{ fontSize: '1rem' }}
                        value={asunto}
                        onIonChange={(e) =>
                          setAsunto((e.detail.value ?? '').toUpperCase())
                        }
                        placeholder="MOTIVO DE LA VISITA / MOVIMIENTO"
                      />
                    </IonItem>
                  </IonList>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          {/* Botones */}
          <IonRow>
            <IonCol size="12">
              <IonButton
                expand="block"
                size="large"
                onClick={guardarRegistro}
              >
                <IonIcon icon={saveOutline} style={{ marginRight: 8 }} />
                {tipoRegistro === 'ENTRADA'
                  ? 'GUARDAR ENTRADA OFFLINE'
                  : 'GUARDAR SALIDA OFFLINE'}
              </IonButton>
            </IonCol>
          </IonRow>

          <IonRow>
            <IonCol size="12">
              <IonButton
                expand="block"
                size="large"
                fill="outline"
                onClick={sincronizarAhora}
              >
                <IonIcon icon={syncOutline} style={{ marginRight: 8 }} />
                SINCRONIZAR AHORA
              </IonButton>
            </IonCol>
          </IonRow>

          <IonRow>
            <IonCol size="12">
              <div style={{ marginTop: 12, fontSize: '0.95rem' }}>
                <IonChip color="warning">
                  <IonLabel style={{ fontSize: '0.9rem' }}>
                    Pendientes sin sincronizar: <strong>{pendientes}</strong>
                  </IonLabel>
                </IonChip>
                {syncStatus && (
                  <IonText color="medium">
                    <p style={{ marginTop: 8 }}>{syncStatus}</p>
                  </IonText>
                )}
              </div>
            </IonCol>
          </IonRow>

          {/* Panel de selección de empleados con filtro */}
          {showSelectorEmpleado && (
            <IonRow>
              <IonCol size="12">
                <IonCard
                  style={{
                    marginTop: 12,
                    border: '1px solid #ccc',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                  }}
                >
                  <IonCardHeader>
                    <IonCardTitle style={{ fontSize: '1rem' }}>
                      {selectorModo === 'ADENTRO'
                        ? 'Empleados adentro'
                        : 'Empleados registrados'}
                    </IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <IonItem>
                      <IonLabel position="stacked">
                        Buscar por No. empleado o nombre
                      </IonLabel>
                      <IonInput
                        value={filtroEmpleado}
                        onIonChange={(e) =>
                          setFiltroEmpleado(e.detail.value ?? '')
                        }
                        placeholder="Ej. 123 o PÉREZ"
                      >
                        <IonIcon
                          icon={searchOutline}
                          slot="end"
                          style={{ marginRight: 6 }}
                        />
                      </IonInput>
                    </IonItem>

                    <div
                      style={{
                        maxHeight: 260,
                        overflowY: 'auto',
                        marginTop: 8,
                        border: '1px solid #eee',
                        borderRadius: 8,
                      }}
                    >
                      <IonList>
                        {empleadosFiltrados.map((e) => (
                          <IonItem
                            key={e.id}
                            button
                            onClick={() => seleccionarEmpleado(e)}
                          >
                            <IonLabel>
                              <div
                                style={{
                                  fontSize: '0.95rem',
                                  fontWeight: 600,
                                }}
                              >
                                {e.noEmpleado ?? 'SIN NO. EMP.'} -{' '}
                                {e.nombre ?? 'SIN NOMBRE'}
                              </div>
                              <div
                                style={{
                                  fontSize: '0.8rem',
                                  color: '#666',
                                }}
                              >
                                {e.empresa ?? ''} · {e.bodega ?? ''}
                              </div>
                              <div
                                style={{
                                  fontSize: '0.75rem',
                                  color: '#999',
                                }}
                              >
                                Último mov.: {e.tipo} ·{' '}
                                {new Date(e.fechaHora).toLocaleString()}
                              </div>
                            </IonLabel>
                          </IonItem>
                        ))}

                        {empleadosFiltrados.length === 0 && (
                          <IonItem>
                            <IonLabel>
                              <IonText color="medium">
                                No hay coincidencias con el filtro.
                              </IonText>
                            </IonLabel>
                          </IonItem>
                        )}
                      </IonList>
                    </div>

                    <IonButton
                      expand="block"
                      fill="clear"
                      color="medium"
                      onClick={cerrarSelector}
                      style={{ marginTop: 8 }}
                    >
                      <IonIcon
                        icon={closeCircleOutline}
                        style={{ marginRight: 6 }}
                      />
                      CERRAR LISTA
                    </IonButton>
                  </IonCardContent>
                </IonCard>
              </IonCol>
            </IonRow>
          )}
        </IonGrid>

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
