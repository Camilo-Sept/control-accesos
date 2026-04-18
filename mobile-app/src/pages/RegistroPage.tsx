import React, { useEffect, useMemo, useState } from 'react'
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
  IonBadge,
} from '@ionic/react'
import {
  logInOutline,
  logOutOutline,
  walkOutline,
  carOutline,
  syncOutline,
  saveOutline,
  searchOutline,
  closeCircleOutline,
  cloudOfflineOutline,
  cloudDoneOutline,
  personCircleOutline,
  shieldCheckmarkOutline,
  tabletPortraitOutline,
  barcodeOutline,
  qrCodeOutline,
  cameraOutline,
} from 'ionicons/icons'
import { useHistory } from 'react-router-dom'
import { Camera, CameraResultType } from '@capacitor/camera'
import { Network } from '@capacitor/network'
import { sqliteService } from '../services/sqliteService'
import { syncService } from '../services/syncService'
import { DEVICE_ID } from '../services/apiConfig'
import {
  buscarPersonaPorQr,
  isCanonicalPersonaQr,
  mapTipoPersonaToCategoria,
} from '../services/personasApi'
import { barcodeScannerService } from '../services/barcodeScannerService'
import {
  TipoRegistro,
  TipoEntidad,
  CategoriaPersona,
  RegistroLocal,
} from '../models/registro'
import { useAuth } from '../context/AuthContext'

const DISPOSITIVO_ID = DEVICE_ID

type ModoCaptura = 'QR' | 'MANUAL'
type SelectorModo = 'ADENTRO' | 'HISTORICO' | null
type ActiveField =
  | 'nombre'
  | 'noEmpleado'
  | 'empresa'
  | 'bodega'
  | 'asunto'
  | 'placa'
  | 'modelo'
  | 'color'
  | null

const FIELD_LABELS: Record<Exclude<ActiveField, null>, string> = {
  nombre: 'Nombre',
  noEmpleado: 'No. empleado',
  empresa: 'Empresa',
  bodega: 'Bodega',
  asunto: 'Asunto',
  placa: 'Placas',
  modelo: 'Modelo',
  color: 'Color',
}

function focusCardStyle(field: ActiveField, activeField: ActiveField): React.CSSProperties {
  const focused = field !== null && field === activeField

  return {
    border: focused ? '2px solid #2563eb' : '1px solid #e2e8f0',
    borderRadius: 16,
    background: focused ? '#eff6ff' : '#ffffff',
    padding: 2,
    transition: 'all 0.18s ease',
  }
}

const RegistroPage: React.FC = () => {
  const history = useHistory()
  const { user, role, logout } = useAuth()

  const [mensaje, setMensaje] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<string | null>(null)
  const [pendientes, setPendientes] = useState<number>(0)
  const [isOnline, setIsOnline] = useState<boolean>(true)
  const [syncing, setSyncing] = useState<boolean>(false)
  const [guardando, setGuardando] = useState<boolean>(false)
  const [activeField, setActiveField] = useState<ActiveField>(null)

  const [tipoRegistro, setTipoRegistro] = useState<TipoRegistro>('ENTRADA')
  const [tipoEntidad, setTipoEntidad] = useState<TipoEntidad>('PEATON')
  const [categoria, setCategoria] = useState<CategoriaPersona>('EMPLEADO')
  const [modoCaptura, setModoCaptura] = useState<ModoCaptura>('MANUAL')

  const [nombre, setNombre] = useState('')
  const [noEmpleado, setNoEmpleado] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [bodega, setBodega] = useState('')
  const [asunto, setAsunto] = useState('')

  const [modelo, setModelo] = useState('')
  const [color, setColor] = useState('')
  const [placa, setPlaca] = useState('')

  const [fotoPlacasPath, setFotoPlacasPath] = useState<string | null>(null)
  const [ultimoQrLeido, setUltimoQrLeido] = useState('')

  const [empleadosLista, setEmpleadosLista] = useState<RegistroLocal[]>([])
  const [showSelectorEmpleado, setShowSelectorEmpleado] = useState(false)
  const [selectorModo, setSelectorModo] = useState<SelectorModo>(null)
  const [filtroEmpleado, setFiltroEmpleado] = useState('')

  const etiquetaCampoActivo = useMemo(() => {
    if (!activeField) {
      return 'Toca un campo para capturar. Si escaneas un código, caerá en el campo activo.'
    }

    return `Estás capturando en: ${FIELD_LABELS[activeField]}`
  }, [activeField])

  const actualizarPendientes = async () => {
    const regs = await sqliteService.obtenerPendientes()
    setPendientes(regs.length)
  }

  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        await actualizarPendientes()

        const status = await Network.getStatus()
        if (mounted) {
          setIsOnline(!!status.connected)
        }

        await syncService.registrarAutoSync()
      } catch (err) {
        console.error('Error en inicialización de RegistroPage:', err)
        if (mounted) {
          setSyncStatus('Error al inicializar sincronización en este dispositivo.')
        }
      }
    }

    void init()

    const listenerPromise = Network.addListener('networkStatusChange', (status) => {
      if (!mounted) return
      setIsOnline(!!status.connected)

      if (status.connected) {
        setSyncStatus('Conexión restablecida. La tablet puede sincronizar.')
      } else {
        setSyncStatus('Sin internet. La tablet seguirá guardando registros localmente.')
      }
    })

    return () => {
      mounted = false
      void listenerPromise.then((listener) => listener.remove()).catch(() => undefined)
    }
  }, [])

  const handleLogout = async () => {
    await logout()
    history.replace('/login')
  }

  const tomarFotoPlacas = async () => {
    try {
      const photo = await Camera.getPhoto({
        quality: 70,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        saveToGallery: false,
      })

      const path = photo.webPath || photo.path || null

      if (!path) {
        setMensaje('No se pudo obtener la foto de las placas.')
        return
      }

      setFotoPlacasPath(path)
      setMensaje('Foto de placas capturada.')
    } catch (err) {
      console.error('Error capturando foto de placas:', err)
      setMensaje('No se tomó ninguna foto.')
    }
  }

  const limpiarCampos = () => {
    setNombre('')
    setNoEmpleado('')
    setEmpresa('')
    setBodega('')
    setAsunto('')
    setModelo('')
    setColor('')
    setPlaca('')
    setFotoPlacasPath(null)
    setUltimoQrLeido('')
    setActiveField(null)
  }

  const validarDatosRequeridos = (): string | null => {
    if (tipoRegistro === 'ENTRADA') {
      if (!nombre.trim()) return 'El nombre es obligatorio.'
      if (!bodega.trim()) return 'La bodega es obligatoria.'
      if (!asunto.trim()) return 'El asunto es obligatorio.'

      if (categoria === 'EMPLEADO' && !noEmpleado.trim()) {
        return 'El número de empleado es obligatorio para empleados.'
      }

      if (tipoEntidad === 'VEHICULO') {
        if (!placa.trim()) return 'Las placas del vehículo son obligatorias.'
        if (!fotoPlacasPath) {
          return 'Debe tomar foto de las placas para registrar la ENTRADA.'
        }
      }

      return null
    }

    if (tipoEntidad === 'VEHICULO') {
      if (!placa.trim()) {
        return 'Para registrar una salida de vehículo, ingrese las placas.'
      }
      if (!fotoPlacasPath) {
        return 'Debe tomar foto de las placas para registrar la SALIDA.'
      }
      return null
    }

    if (categoria === 'EMPLEADO') {
      if (!noEmpleado.trim()) {
        return 'Para registrar una salida de empleado, ingrese el No. de empleado.'
      }
      return null
    }

    if (!nombre.trim() || !empresa.trim() || !bodega.trim()) {
      return 'Para registrar una salida de proveedor o visitante, ingrese nombre, empresa y bodega.'
    }

    return null
  }

  const validarEntrada = async (): Promise<string | null> => {
    if (tipoEntidad === 'PEATON' && categoria === 'EMPLEADO') {
      const clave = noEmpleado.trim().toUpperCase()
      if (!clave) return 'El número de empleado es obligatorio.'

      const ultimo = await sqliteService.buscarUltimoPorNoEmpleadoHoy(clave)
      const nombreUpper = nombre.trim().toUpperCase()

      if (ultimo && ultimo.tipo === 'ENTRADA') {
        if (!ultimo.nombre || ultimo.nombre === nombreUpper) {
          return 'Este empleado ya tiene una ENTRADA registrada y no ha salido.'
        }
      }
      return null
    }

    if (tipoEntidad === 'VEHICULO') {
      const placaUpper = placa.trim().toUpperCase()
      if (!placaUpper) {
        return 'Las placas son obligatorias para la ENTRADA de vehículo.'
      }

      const ultimo = await sqliteService.buscarUltimoPorPlacaHoy(placaUpper)
      if (ultimo && ultimo.tipo === 'ENTRADA') {
        return 'Este vehículo ya tiene una ENTRADA registrada y no ha salido.'
      }
      return null
    }

    return null
  }

  const prepararSalida = async (): Promise<void> => {
    try {
      if (tipoEntidad === 'VEHICULO') {
        const placaUpper = placa.trim().toUpperCase()
        if (!placaUpper) return

        const ultimo = await sqliteService.buscarUltimoPorPlacaHoy(placaUpper)
        if (!ultimo || ultimo.tipo !== 'ENTRADA') {
          setMensaje(
            'No se encontró ENTRADA previa para estas placas. Se guardará SALIDA sin registro de ENTRADA.'
          )
          return
        }

        setNombre((ultimo.nombre ?? '').toUpperCase())
        setNoEmpleado((ultimo.noEmpleado ?? '').toUpperCase())
        setEmpresa((ultimo.empresa ?? '').toUpperCase())
        setBodega((ultimo.bodega ?? '').toUpperCase())
        setAsunto((ultimo.asunto ?? '').toUpperCase())
        setModelo((ultimo.modelo ?? '').toUpperCase())
        setColor((ultimo.color ?? '').toUpperCase())
        return
      }

      if (categoria === 'EMPLEADO') {
        const clave = noEmpleado.trim().toUpperCase()
        if (!clave) return

        const ultimo = await sqliteService.buscarUltimoPorNoEmpleadoHoy(clave)
        if (!ultimo || ultimo.tipo !== 'ENTRADA') {
          setMensaje(
            'No se encontró ENTRADA previa para este empleado. Se guardará SALIDA sin registro de ENTRADA.'
          )
          return
        }

        setNombre((ultimo.nombre ?? '').toUpperCase())
        setEmpresa((ultimo.empresa ?? '').toUpperCase())
        setBodega((ultimo.bodega ?? '').toUpperCase())
        setAsunto((ultimo.asunto ?? '').toUpperCase())
        return
      }

      const n = nombre.trim().toUpperCase()
      const e = empresa.trim().toUpperCase()
      const b = bodega.trim().toUpperCase()
      if (!n || !e || !b) return

      const ultimo = await sqliteService.buscarUltimoPorPersonaHoy(n, e, b)
      if (!ultimo || ultimo.tipo !== 'ENTRADA') {
        setMensaje(
          'No se encontró ENTRADA previa para esta persona. Se guardará SALIDA sin registro de ENTRADA.'
        )
        return
      }

      setAsunto((ultimo.asunto ?? '').toUpperCase())
    } catch (err) {
      console.error('Error preparando salida:', err)
    }
  }

  const autollenarPorQrCanonico = async (qr: string) => {
    try {
      const persona = await buscarPersonaPorQr(qr)
      const categoriaMapeada = mapTipoPersonaToCategoria(persona.tipoPersona)

      if (!categoriaMapeada) {
        setMensaje(`El tipo ${persona.tipoPersona} todavía no está soportado en la tablet.`)
        return
      }

      setModoCaptura('QR')
      setTipoEntidad('PEATON')
      setCategoria(categoriaMapeada)

      setNombre((persona.nombre ?? '').toUpperCase())
      setNoEmpleado((persona.noEmpleado ?? '').toUpperCase())
      setEmpresa((persona.empresa ?? '').toUpperCase())
      setBodega((persona.bodega ?? '').toUpperCase())

      setPlaca('')
      setModelo('')
      setColor('')
      setFotoPlacasPath(null)

      setMensaje(`Datos cargados desde QR: ${(persona.nombre ?? '').toUpperCase()}`)
    } catch (err) {
      console.error('Error consultando QR canónico:', err)
      setMensaje(
        err instanceof Error ? err.message : 'No se pudo consultar la persona por QR.'
      )
    }
  }

  const autollenarPorPlaca = async (valor: string) => {
    const limpia = valor.trim().toUpperCase()
    if (!limpia) return

    const ultimo = await sqliteService.buscarUltimoPorPlacaConFallback(limpia)
    if (!ultimo) return

    setNombre((ultimo.nombre ?? '').toUpperCase())
    setNoEmpleado((ultimo.noEmpleado ?? '').toUpperCase())
    setEmpresa((ultimo.empresa ?? '').toUpperCase())
    setBodega((ultimo.bodega ?? '').toUpperCase())
    setAsunto((ultimo.asunto ?? '').toUpperCase())
    setModelo((ultimo.modelo ?? '').toUpperCase())
    setColor((ultimo.color ?? '').toUpperCase())
    setCategoria(ultimo.categoria)
  }

  const autollenarPorNoEmpleado = async (valor: string) => {
    const limpio = valor.trim().toUpperCase()
    if (!limpio) return

    const ultimo = await sqliteService.buscarUltimoPorNoEmpleadoConFallback(limpio)
    if (!ultimo) return

    setNombre((ultimo.nombre ?? '').toUpperCase())
    setEmpresa((ultimo.empresa ?? '').toUpperCase())
    setBodega((ultimo.bodega ?? '').toUpperCase())
    setAsunto((ultimo.asunto ?? '').toUpperCase())
  }

  const autollenarPorPersona = async () => {
    const n = nombre.trim().toUpperCase()
    const e = empresa.trim().toUpperCase()
    const b = bodega.trim().toUpperCase()

    if (!n || !e || !b) return

    const ultimo = await sqliteService.buscarUltimoPorPersonaConFallback(n, e, b)
    if (!ultimo) return

    setAsunto((ultimo.asunto ?? '').toUpperCase())
  }

  const procesarQR = async (contenido: string) => {
    try {
      const limpio = contenido.trim()
      if (!limpio) {
        setMensaje('QR vacío o ilegible.')
        return
      }

      setUltimoQrLeido(limpio)
      setModoCaptura('QR')

      if (isCanonicalPersonaQr(limpio)) {
        await autollenarPorQrCanonico(limpio)
        return
      }

      const partes = limpio.split('|')
      if (partes.length < 5) {
        setMensaje('Formato de QR no reconocido.')
        return
      }

      const sistema = partes[0]?.toUpperCase()
      const version = partes[1]?.trim()
      const tipoQR = partes[2]?.toUpperCase()

      if (sistema !== 'IMPULSO' || version !== '1') {
        setMensaje('QR no pertenece al sistema IMPULSO o versión inválida.')
        return
      }

      if (tipoQR === 'E') {
        const noEmp = (partes[3] ?? '').trim().toUpperCase()
        const nom = (partes[4] ?? '').trim().toUpperCase()

        if (!noEmp || !nom) {
          setMensaje('QR de empleado incompleto.')
          return
        }

        setTipoEntidad('PEATON')
        setCategoria('EMPLEADO')
        setNoEmpleado(noEmp)
        setNombre(nom)

        await autollenarPorNoEmpleado(noEmp)

        setMensaje('Datos de empleado cargados desde QR. Revise y guarde.')
        return
      }

      if (tipoQR === 'V') {
        if (partes.length < 6) {
          setMensaje('QR de vehículo incompleto.')
          return
        }

        const noEmp = (partes[3] ?? '').trim().toUpperCase()
        const nom = (partes[4] ?? '').trim().toUpperCase()
        const placasQR = (partes[5] ?? '').trim().toUpperCase()

        if (!noEmp || !nom || !placasQR) {
          setMensaje('QR de vehículo incompleto.')
          return
        }

        setTipoEntidad('VEHICULO')
        setCategoria('EMPLEADO')
        setNoEmpleado(noEmp)
        setNombre(nom)
        setPlaca(placasQR)

        await autollenarPorPlaca(placasQR)

        setMensaje('Datos de vehículo cargados desde QR. Revise y guarde.')
        return
      }

      setMensaje('Tipo de QR desconocido. Use solo QR válidos del sistema.')
    } catch (err) {
      console.error('Error procesando QR:', err)
      setMensaje('Error al procesar el código QR.')
    }
  }

  const manejarScanQR = async () => {
    try {
      const simulado = window.prompt(
        'Lectura de QR (temporal): pega o escribe el contenido del QR'
      )
      if (simulado) {
        await procesarQR(simulado)
      } else {
        setMensaje('No se proporcionó contenido de QR.')
      }
    } catch (err) {
      console.error('Error procesando QR simulado:', err)
      setMensaje('Error al procesar el código QR.')
    }
  }

  const manejarScanCodigoEmpleado = async () => {
    try {
      setActiveField('noEmpleado')
      const valor = await barcodeScannerService.scanEmployeeNumber()

      setNoEmpleado(valor)
      await autollenarPorNoEmpleado(valor)

      setMensaje(`Código leído. No. empleado: ${valor}`)
    } catch (err) {
      console.error('Error leyendo código de barras:', err)
      setMensaje(
        err instanceof Error
          ? err.message
          : 'No se pudo leer el código de barras del empleado.'
      )
    }
  }

  const guardarRegistro = async () => {
    const nombreUpper = nombre.trim().toUpperCase()
    const noEmpleadoUpper = noEmpleado.trim().toUpperCase()
    const empresaUpper = empresa.trim().toUpperCase()
    const bodegaUpper = bodega.trim().toUpperCase()
    const asuntoUpper = asunto.trim().toUpperCase()
    const placaUpper = placa.trim().toUpperCase()
    const modeloUpper = modelo.trim().toUpperCase()
    const colorUpper = color.trim().toUpperCase()

    setNombre(nombreUpper)
    setNoEmpleado(noEmpleadoUpper)
    setEmpresa(empresaUpper)
    setBodega(bodegaUpper)
    setAsunto(asuntoUpper)
    setPlaca(placaUpper)
    setModelo(modeloUpper)
    setColor(colorUpper)

    const errorBasico = validarDatosRequeridos()
    if (errorBasico) {
      setMensaje(errorBasico)
      return
    }

    if (tipoRegistro === 'ENTRADA') {
      const errorEntrada = await validarEntrada()
      if (errorEntrada) {
        setMensaje(errorEntrada)
        return
      }
    } else {
      await prepararSalida()
    }

    const qrContenido = modoCaptura === 'QR' ? ultimoQrLeido || null : null

    try {
      setGuardando(true)

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
        modelo: tipoEntidad === 'VEHICULO' ? modeloUpper || null : null,
        color: tipoEntidad === 'VEHICULO' ? colorUpper || null : null,
        placa: tipoEntidad === 'VEHICULO' ? placaUpper || null : null,
        fotoPlacasPath: tipoEntidad === 'VEHICULO' ? fotoPlacasPath ?? null : null,

        qrContenido,
        dispositivoId: DISPOSITIVO_ID,
      })

      await actualizarPendientes()
      limpiarCampos()

      setMensaje(
        tipoRegistro === 'ENTRADA'
          ? 'Entrada guardada en la tablet.'
          : 'Salida guardada en la tablet.'
      )
    } catch (err) {
      console.error('Error guardando registro local:', err)
      setMensaje(
        err instanceof Error
          ? `No se pudo guardar el registro: ${err.message}`
          : 'No se pudo guardar el registro en la tablet.'
      )
    } finally {
      setGuardando(false)
    }
  }

  const sincronizarAhora = async () => {
    try {
      setSyncing(true)
      setSyncStatus('Sincronizando...')
      const { enviados } = await syncService.syncPendientes(true)
      await actualizarPendientes()
      setSyncStatus(`Sincronización completa. Registros enviados: ${enviados}`)
    } catch (error: unknown) {
      await actualizarPendientes()
      if (error instanceof Error) {
        setSyncStatus(`Error de sincronización: ${error.message}`)
      } else {
        setSyncStatus('Error de sincronización desconocido')
      }
    } finally {
      setSyncing(false)
    }
  }

  const etiquetaEntidad = tipoEntidad === 'PEATON' ? 'Peatón' : 'Vehículo'

  const abrirSelectorEmpleadoDentro = async () => {
    try {
      const todos = await sqliteService.obtenerRegistrosOrdenadosPorFechaDesc()
      const mapa = new Map<string, RegistroLocal>()

      for (const reg of todos) {
        const clave = (reg.noEmpleado ?? '').trim().toUpperCase()
        if (!clave) continue
        if (reg.categoria !== 'EMPLEADO') continue
        if (reg.tipoEntidad !== 'PEATON') continue
        if (!mapa.has(clave)) {
          mapa.set(clave, reg)
        }
      }

      const lista = Array.from(mapa.values()).filter((r) => r.tipo === 'ENTRADA')

      if (!lista.length) {
        setMensaje('No hay empleados adentro actualmente.')
        return
      }

      setEmpleadosLista(lista)
      setFiltroEmpleado('')
      setSelectorModo('ADENTRO')
      setShowSelectorEmpleado(true)
    } catch (err) {
      console.error('Error cargando empleados adentro:', err)
      setMensaje('No se pudo cargar la lista de empleados adentro.')
    }
  }

  const abrirSelectorEmpleadoHistorico = async () => {
    try {
      const todos = await sqliteService.obtenerRegistrosOrdenadosPorFechaDesc()
      const mapa = new Map<string, RegistroLocal>()

      for (const reg of todos) {
        const clave = (reg.noEmpleado ?? '').trim().toUpperCase()
        if (!clave) continue
        if (reg.categoria !== 'EMPLEADO') continue
        if (reg.tipoEntidad !== 'PEATON') continue
        if (!mapa.has(clave)) {
          mapa.set(clave, reg)
        }
      }

      const lista = Array.from(mapa.values())

      if (!lista.length) {
        setMensaje('No hay empleados registrados todavía.')
        return
      }

      setEmpleadosLista(lista)
      setFiltroEmpleado('')
      setSelectorModo('HISTORICO')
      setShowSelectorEmpleado(true)
    } catch (err) {
      console.error('Error cargando empleados históricos:', err)
      setMensaje('No se pudo cargar la lista de empleados registrados.')
    }
  }

  const cerrarSelector = () => {
    setShowSelectorEmpleado(false)
    setSelectorModo(null)
    setFiltroEmpleado('')
  }

  const seleccionarEmpleado = (sel: RegistroLocal) => {
    setNoEmpleado((sel.noEmpleado ?? '').toUpperCase())
    setNombre((sel.nombre ?? '').toUpperCase())
    setEmpresa((sel.empresa ?? '').toUpperCase())
    setBodega((sel.bodega ?? '').toUpperCase())
    setAsunto((sel.asunto ?? '').toUpperCase())
    cerrarSelector()
  }

  const empleadosFiltrados = useMemo(() => {
    const term = filtroEmpleado.trim().toUpperCase()
    if (!term) return empleadosLista
    return empleadosLista.filter((e) => {
      const noEmp = (e.noEmpleado ?? '').toUpperCase()
      const nom = (e.nombre ?? '').toUpperCase()
      return noEmp.includes(term) || nom.includes(term)
    })
  }, [filtroEmpleado, empleadosLista])

  const iconoMovimiento = tipoRegistro === 'ENTRADA' ? logInOutline : logOutOutline
  const colorMovimiento = tipoRegistro === 'ENTRADA' ? 'success' : 'danger'

  const mostrarBotonSelectorAdentro =
    tipoRegistro === 'SALIDA' && tipoEntidad === 'PEATON' && categoria === 'EMPLEADO'

  const mostrarBotonSelectorHistorico =
    tipoRegistro === 'ENTRADA' && tipoEntidad === 'PEATON' && categoria === 'EMPLEADO'

  const estadoConexion = isOnline ? 'EN LÍNEA' : 'SIN INTERNET'
  const estadoConexionColor = isOnline ? 'success' : 'warning'

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle
            style={{
              fontSize: '1.15rem',
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
                  style={{
                    display: 'grid',
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 10,
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'grid', gap: 8 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        <IonChip color="primary">
                          <IonIcon icon={personCircleOutline} style={{ marginRight: 6 }} />
                          <IonLabel>{user?.email ?? 'Sin usuario'}</IonLabel>
                        </IonChip>

                        <IonChip color="medium">
                          <IonIcon icon={shieldCheckmarkOutline} style={{ marginRight: 6 }} />
                          <IonLabel>{role ?? 'SIN ROL'}</IonLabel>
                        </IonChip>

                        <IonChip color="tertiary">
                          <IonIcon icon={tabletPortraitOutline} style={{ marginRight: 6 }} />
                          <IonLabel>{DISPOSITIVO_ID.toUpperCase()}</IonLabel>
                        </IonChip>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        <IonChip color={estadoConexionColor}>
                          <IonIcon
                            icon={isOnline ? cloudDoneOutline : cloudOfflineOutline}
                            style={{ marginRight: 6 }}
                          />
                          <IonLabel>{estadoConexion}</IonLabel>
                        </IonChip>

                        <IonChip color="warning">
                          <IonLabel>
                            Pendientes: <strong>{pendientes}</strong>
                          </IonLabel>
                        </IonChip>

                        {syncing && (
                          <IonChip color="secondary">
                            <IonIcon icon={syncOutline} style={{ marginRight: 6 }} />
                            <IonLabel>Sincronizando</IonLabel>
                          </IonChip>
                        )}
                      </div>
                    </div>

                    <IonButton color="medium" fill="outline" onClick={handleLogout}>
                      <IonIcon icon={logOutOutline} style={{ marginRight: 6 }} />
                      Cerrar sesión
                    </IonButton>
                  </div>

                  <div
                    style={{
                      borderRadius: 16,
                      padding: 12,
                      background: isOnline ? '#ecfdf5' : '#fffbeb',
                      border: isOnline ? '1px solid #a7f3d0' : '1px solid #fde68a',
                    }}
                  >
                    <IonText color={isOnline ? 'success' : 'warning'}>
                      <p style={{ margin: 0, fontWeight: 700 }}>
                        {isOnline
                          ? 'La tablet está conectada y puede sincronizar.'
                          : 'La tablet está sin internet, pero seguirá guardando todo localmente.'}
                      </p>
                    </IonText>

                    {syncStatus && (
                      <IonText color="medium">
                        <p style={{ margin: '6px 0 0 0' }}>{syncStatus}</p>
                      </IonText>
                    )}
                  </div>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          <IonRow>
            <IonCol size="12">
              <IonCard>
                <IonCardContent style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <IonChip
                    color={colorMovimiento}
                    style={{ fontSize: '1rem', padding: '0.45rem 0.9rem' }}
                  >
                    <IonIcon icon={iconoMovimiento} style={{ marginRight: 4 }} />
                    <IonLabel style={{ fontWeight: 700 }}>
                      {tipoRegistro === 'ENTRADA'
                        ? 'REGISTRANDO ENTRADA'
                        : 'REGISTRANDO SALIDA'}
                    </IonLabel>
                  </IonChip>

                  <IonText>
                    <p style={{ margin: 0, fontSize: '0.98rem' }}>
                      <strong>Tipo:</strong> {etiquetaEntidad.toUpperCase()} &nbsp;|&nbsp;
                      <strong>Categoría:</strong> {categoria}
                    </p>
                  </IonText>

                  <IonText color="medium">
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>
                      Captura con calma. Si algo está mal, la app te avisará antes de guardar.
                    </p>
                  </IonText>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

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
                      <IonLabel position="stacked" style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                        Tipo de movimiento
                      </IonLabel>
                      <IonSegment
                        value={tipoRegistro}
                        onIonChange={(event) => {
                          setTipoRegistro(event.detail.value as TipoRegistro)
                        }}
                      >
                        <IonSegmentButton value="ENTRADA">
                          <IonLabel style={{ fontSize: '0.85rem' }}>
                            <IonIcon icon={logInOutline} style={{ marginRight: 4 }} />
                            ENTRADA
                          </IonLabel>
                        </IonSegmentButton>
                        <IonSegmentButton value="SALIDA">
                          <IonLabel style={{ fontSize: '0.85rem' }}>
                            <IonIcon icon={logOutOutline} style={{ marginRight: 4 }} />
                            SALIDA
                          </IonLabel>
                        </IonSegmentButton>
                      </IonSegment>
                    </IonItem>

                    <IonItem lines="none" style={{ marginTop: 8 }}>
                      <IonLabel position="stacked" style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                        Tipo
                      </IonLabel>
                      <IonSegment
                        value={tipoEntidad}
                        onIonChange={(event) => {
                          setTipoEntidad(event.detail.value as TipoEntidad)
                          limpiarCampos()
                        }}
                      >
                        <IonSegmentButton value="PEATON">
                          <IonLabel style={{ fontSize: '0.85rem' }}>
                            <IonIcon icon={walkOutline} style={{ marginRight: 4 }} />
                            PEATÓN
                          </IonLabel>
                        </IonSegmentButton>
                        <IonSegmentButton value="VEHICULO">
                          <IonLabel style={{ fontSize: '0.85rem' }}>
                            <IonIcon icon={carOutline} style={{ marginRight: 4 }} />
                            VEHÍCULO
                          </IonLabel>
                        </IonSegmentButton>
                      </IonSegment>
                    </IonItem>

                    <IonItem lines="none" style={{ marginTop: 8 }}>
                      <IonLabel position="stacked" style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                        Categoría
                      </IonLabel>
                      <IonSegment
                        value={categoria}
                        onIonChange={(event) => {
                          setCategoria(event.detail.value as CategoriaPersona)
                          limpiarCampos()
                        }}
                      >
                        <IonSegmentButton value="EMPLEADO">
                          <IonLabel style={{ fontSize: '0.8rem' }}>EMPLEADO</IonLabel>
                        </IonSegmentButton>
                        <IonSegmentButton value="PROVEEDOR">
                          <IonLabel style={{ fontSize: '0.8rem' }}>PROVEEDOR</IonLabel>
                        </IonSegmentButton>
                        <IonSegmentButton value="VISITANTE">
                          <IonLabel style={{ fontSize: '0.8rem' }}>VISITANTE</IonLabel>
                        </IonSegmentButton>
                      </IonSegment>
                    </IonItem>

                    <IonItem lines="none" style={{ marginTop: 8 }}>
                      <IonLabel position="stacked" style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                        Modo de captura
                      </IonLabel>
                      <IonSegment
                        value={modoCaptura}
                        onIonChange={(event) => setModoCaptura(event.detail.value as ModoCaptura)}
                      >
                        <IonSegmentButton value="QR">
                          <IonLabel style={{ fontSize: '0.8rem' }}>QR</IonLabel>
                        </IonSegmentButton>
                        <IonSegmentButton value="MANUAL">
                          <IonLabel style={{ fontSize: '0.8rem' }}>MANUAL</IonLabel>
                        </IonSegmentButton>
                      </IonSegment>
                    </IonItem>

                    {modoCaptura === 'QR' && (
                      <IonItem lines="none" style={{ marginTop: 8 }}>
                        <IonButton expand="block" size="large" onClick={manejarScanQR}>
                          <IonIcon icon={qrCodeOutline} style={{ marginRight: 8 }} />
                          ESCANEAR QR ({etiquetaEntidad})
                        </IonButton>
                      </IonItem>
                    )}
                  </IonList>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          <IonRow>
            <IonCol size="12">
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle style={{ fontSize: '1.05rem' }}>
                    Datos de {etiquetaEntidad.toUpperCase()}
                  </IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <div
                    style={{
                      marginBottom: 12,
                      borderRadius: 14,
                      padding: 12,
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                    }}
                  >
                    <IonText color="primary">
                      <p style={{ margin: 0, fontWeight: 700 }}>Ayuda rápida</p>
                    </IonText>
                    <IonText color="medium">
                      <p style={{ margin: '6px 0 0 0' }}>{etiquetaCampoActivo}</p>
                    </IonText>
                  </div>

                  <IonList>
                    <div style={focusCardStyle('nombre', activeField)}>
                      <IonItem lines="none">
                        <IonLabel position="stacked">
                          NOMBRE (PERSONA / CONDUCTOR) <IonText color="danger">*</IonText>
                        </IonLabel>
                        <IonInput
                          style={{ fontSize: '1rem' }}
                          value={nombre}
                          onIonFocus={() => setActiveField('nombre')}
                          onIonBlur={() => setActiveField(null)}
                          onIonChange={(event) =>
                            setNombre((event.detail.value ?? '').toUpperCase())
                          }
                          placeholder="EJ. JUAN PÉREZ"
                        />
                      </IonItem>
                    </div>

                    {categoria === 'EMPLEADO' && (
                      <>
                        <div style={focusCardStyle('noEmpleado', activeField)}>
                          <IonItem lines="none">
                            <IonLabel position="stacked">
                              NO. EMPLEADO <IonText color="danger">*</IonText>
                            </IonLabel>
                            <IonInput
                              style={{ fontSize: '1rem' }}
                              value={noEmpleado}
                              onIonFocus={() => setActiveField('noEmpleado')}
                              onIonBlur={() => {
                                setActiveField(null)
                                void autollenarPorNoEmpleado(noEmpleado)
                              }}
                              onIonChange={(event) =>
                                setNoEmpleado((event.detail.value ?? '').toUpperCase())
                              }
                              placeholder="NÚMERO DE NÓMINA"
                            />
                          </IonItem>
                        </div>

                        <IonItem lines="none" style={{ marginTop: 8 }}>
                          <IonButton
                            expand="block"
                            size="large"
                            color="tertiary"
                            onClick={manejarScanCodigoEmpleado}
                          >
                            <IonIcon icon={barcodeOutline} style={{ marginRight: 8 }} />
                            ESCANEAR CÓDIGO DE BARRAS
                          </IonButton>
                        </IonItem>

                        {mostrarBotonSelectorHistorico && (
                          <IonItem lines="none">
                            <IonButton
                              expand="block"
                              fill="outline"
                              onClick={abrirSelectorEmpleadoHistorico}
                              style={{ marginTop: 8 }}
                            >
                              <IonIcon icon={searchOutline} style={{ marginRight: 6 }} />
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
                              <IonIcon icon={searchOutline} style={{ marginRight: 6 }} />
                              SELECCIONAR EMPLEADO ADENTRO
                            </IonButton>
                          </IonItem>
                        )}
                      </>
                    )}

                    {tipoEntidad === 'VEHICULO' && (
                      <>
                        <div style={focusCardStyle('placa', activeField)}>
                          <IonItem lines="none">
                            <IonLabel position="stacked">
                              PLACAS <IonText color="danger">*</IonText>
                            </IonLabel>
                            <IonInput
                              style={{ fontSize: '1rem' }}
                              value={placa}
                              onIonFocus={() => setActiveField('placa')}
                              onIonBlur={() => {
                                setActiveField(null)
                                void autollenarPorPlaca(placa)
                              }}
                              onIonChange={(event) => {
                                const value = (event.detail.value ?? '').toUpperCase()
                                setPlaca(value)
                              }}
                              placeholder="EJ. ABC-1234"
                            />
                          </IonItem>
                        </div>

                        <IonItem lines="none">
                          <IonButton
                            expand="block"
                            onClick={tomarFotoPlacas}
                            style={{ marginTop: 8, marginBottom: 8 }}
                          >
                            <IonIcon icon={cameraOutline} style={{ marginRight: 8 }} />
                            TOMAR FOTO DE PLACAS
                          </IonButton>
                        </IonItem>

                        {fotoPlacasPath && (
                          <IonItem lines="none">
                            <IonLabel position="stacked">VISTA PREVIA DE PLACAS</IonLabel>
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

                        <div style={focusCardStyle('modelo', activeField)}>
                          <IonItem lines="none">
                            <IonLabel position="stacked">MODELO</IonLabel>
                            <IonInput
                              style={{ fontSize: '1rem' }}
                              value={modelo}
                              onIonFocus={() => setActiveField('modelo')}
                              onIonBlur={() => setActiveField(null)}
                              onIonChange={(event) =>
                                setModelo((event.detail.value ?? '').toUpperCase())
                              }
                              placeholder="MODELO DEL VEHÍCULO"
                            />
                          </IonItem>
                        </div>

                        <div style={focusCardStyle('color', activeField)}>
                          <IonItem lines="none">
                            <IonLabel position="stacked">COLOR</IonLabel>
                            <IonInput
                              style={{ fontSize: '1rem' }}
                              value={color}
                              onIonFocus={() => setActiveField('color')}
                              onIonBlur={() => setActiveField(null)}
                              onIonChange={(event) =>
                                setColor((event.detail.value ?? '').toUpperCase())
                              }
                              placeholder="COLOR DEL VEHÍCULO"
                            />
                          </IonItem>
                        </div>
                      </>
                    )}

                    <div style={focusCardStyle('empresa', activeField)}>
                      <IonItem lines="none">
                        <IonLabel position="stacked">
                          EMPRESA <IonText color="danger">*</IonText>
                        </IonLabel>
                        <IonInput
                          style={{ fontSize: '1rem' }}
                          value={empresa}
                          onIonFocus={() => setActiveField('empresa')}
                          onIonBlur={() => setActiveField(null)}
                          onIonChange={(event) =>
                            setEmpresa((event.detail.value ?? '').toUpperCase())
                          }
                          placeholder="IMPULSO, EXPEDITORS, OTRA..."
                        />
                      </IonItem>
                    </div>

                    <div style={focusCardStyle('bodega', activeField)}>
                      <IonItem lines="none">
                        <IonLabel position="stacked">
                          BODEGA <IonText color="danger">*</IonText>
                        </IonLabel>
                        <IonInput
                          style={{ fontSize: '1rem' }}
                          value={bodega}
                          onIonFocus={() => setActiveField('bodega')}
                          onIonBlur={() => {
                            setActiveField(null)
                            if (categoria !== 'EMPLEADO') {
                              void autollenarPorPersona()
                            }
                          }}
                          onIonChange={(event) =>
                            setBodega((event.detail.value ?? '').toUpperCase())
                          }
                          placeholder="EJ. BODEGA 1, ALMACÉN A..."
                        />
                      </IonItem>
                    </div>

                    <div style={focusCardStyle('asunto', activeField)}>
                      <IonItem lines="none">
                        <IonLabel position="stacked">
                          ASUNTO <IonText color="danger">*</IonText>
                        </IonLabel>
                        <IonInput
                          style={{ fontSize: '1rem' }}
                          value={asunto}
                          onIonFocus={() => setActiveField('asunto')}
                          onIonBlur={() => setActiveField(null)}
                          onIonChange={(event) =>
                            setAsunto((event.detail.value ?? '').toUpperCase())
                          }
                          placeholder="MOTIVO DE LA VISITA / MOVIMIENTO"
                        />
                      </IonItem>
                    </div>
                  </IonList>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          <IonRow>
            <IonCol size="12">
              <IonButton expand="block" size="large" disabled={guardando} onClick={guardarRegistro}>
                <IonIcon icon={saveOutline} style={{ marginRight: 8 }} />
                {guardando
                  ? 'GUARDANDO...'
                  : tipoRegistro === 'ENTRADA'
                    ? 'GUARDAR ENTRADA EN TABLET'
                    : 'GUARDAR SALIDA EN TABLET'}
              </IonButton>
            </IonCol>
          </IonRow>

          <IonRow>
            <IonCol size="12">
              <IonButton
                expand="block"
                size="large"
                fill="outline"
                disabled={syncing}
                onClick={sincronizarAhora}
              >
                <IonIcon icon={syncOutline} style={{ marginRight: 8 }} />
                {syncing ? 'SINCRONIZANDO...' : 'SINCRONIZAR AHORA'}
              </IonButton>
            </IonCol>
          </IonRow>

          <IonRow>
            <IonCol size="12">
              <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <IonBadge color="warning" style={{ fontSize: '0.95rem', padding: '10px 12px' }}>
                  Pendientes sin sincronizar: {pendientes}
                </IonBadge>

                <IonBadge
                  color={isOnline ? 'success' : 'medium'}
                  style={{ fontSize: '0.95rem', padding: '10px 12px' }}
                >
                  {isOnline ? 'Internet disponible' : 'Modo offline'}
                </IonBadge>
              </div>
            </IonCol>
          </IonRow>

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
                        onIonChange={(event) => setFiltroEmpleado(event.detail.value ?? '')}
                        placeholder="Ej. 123 o PÉREZ"
                      >
                        <IonIcon icon={searchOutline} slot="end" style={{ marginRight: 6 }} />
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
                        {empleadosFiltrados.map((empleado) => (
                          <IonItem
                            key={empleado.id}
                            button
                            onClick={() => seleccionarEmpleado(empleado)}
                          >
                            <IonLabel>
                              <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                                {empleado.noEmpleado ?? 'SIN NO. EMP.'} -{' '}
                                {empleado.nombre ?? 'SIN NOMBRE'}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: '#666' }}>
                                {empleado.empresa ?? ''} · {empleado.bodega ?? ''}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#999' }}>
                                Último mov.: {empleado.tipo} ·{' '}
                                {new Date(empleado.fechaHora).toLocaleString()}
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
                      <IonIcon icon={closeCircleOutline} style={{ marginRight: 6 }} />
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
          duration={2600}
          onDidDismiss={() => setMensaje(null)}
        />
      </IonContent>
    </IonPage>
  )
}

export default RegistroPage