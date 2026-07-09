import type { CapacitorConfig } from '@capacitor/cli'

const allowCleartext = process.env.CAPACITOR_ALLOW_CLEARTEXT === '1'

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'Control de Accesos',
  webDir: 'dist',
  server: {
    androidScheme: allowCleartext ? 'http' : 'https',
    cleartext: allowCleartext,
  },
  android: {
    allowMixedContent: allowCleartext,
  },
}

export default config
