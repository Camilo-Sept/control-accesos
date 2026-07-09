# Control de Accesos

Sistema para registrar entradas y salidas desde una tablet, trabajar sin conexión y administrar personas, usuarios, reportes y sincronizaciones desde un panel web.

## Componentes

- `backend`: API Express, PostgreSQL, autenticación JWT y exportaciones.
- `web-admin`: panel administrativo Next.js.
- `mobile-app`: aplicación Ionic/Capacitor con SQLite, cámara y escaneo QR/código de barras.

## Requisitos

- Node.js 22
- PostgreSQL 16 o compatible
- Android Studio y JDK 21 para generar APK

Docker Desktop es opcional. El proyecto puede usar PostgreSQL instalado localmente.

## Configuración

1. Copiar los archivos `.env.example` de cada aplicación a su correspondiente `.env` o `.env.local`.
2. Generar valores únicos para `JWT_SECRET` y `TABLET_API_KEY`.
3. Usar la misma `TABLET_API_KEY` y el mismo `TABLET_DEVICE_ID` en backend y app móvil.
4. Configurar `ADMIN_EMAIL`, `ADMIN_PASSWORD` y `ADMIN_NAME` únicamente en `backend/.env`.

Nunca se deben subir archivos `.env` al repositorio.

## Base de datos

```bash
cd backend
npm ci
npm run db:setup
```

`db:setup` aplica las migraciones pendientes, conserva un solo usuario con rol ADMIN activo y registra la tablet configurada. Es idempotente.

## Desarrollo

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd web-admin && npm ci && npm run dev

# Terminal 3
cd mobile-app && npm ci && npm run dev -- --host 0.0.0.0
```

- API: `http://localhost:3001`
- Panel: `http://localhost:3000`
- App móvil web: `http://localhost:5173`

## Android

```bash
cd mobile-app
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

El APK de desarrollo queda en `mobile-app/android/app/build/outputs/apk/debug/`.

Para desarrollo local contra una API HTTP, ejecutar la sincronización de Capacitor con `CAPACITOR_ALLOW_CLEARTEXT=1`. Producción usa HTTPS y bloquea contenido mixto por defecto.

## Verificación

```bash
cd backend && npm run build
cd ../web-admin && npm run lint && npm run build
cd ../mobile-app && npm run lint && npm run build && npm run test.unit -- --run
```

GitHub Actions ejecuta estas verificaciones en cada push y pull request.
