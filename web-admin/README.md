# Panel administrativo

Panel Next.js del sistema Control de Accesos.

## Configuración

```bash
cp .env.example .env.local
npm ci
npm run dev
```

`NEXT_PUBLIC_API_BASE_URL` debe apuntar al backend, por ejemplo `http://localhost:3001`.

La sesión se guarda en una cookie `httpOnly`; el navegador no tiene acceso directo al JWT.

Consulta el [README principal](../README.md) para preparar la base de datos, app móvil y compilación Android.
