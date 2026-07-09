import React, { useMemo, useState } from 'react'
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonText,
} from '@ionic/react'
import { lockClosedOutline, personCircleOutline, tabletPortraitOutline } from 'ionicons/icons'
import { useHistory } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { DEVICE_ID } from '../services/apiConfig'

const LoginPage: React.FC = () => {
  const history = useHistory()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tabletLabel = useMemo(() => DEVICE_ID.toUpperCase(), [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      await login({ email, password })
      history.replace('/registro')
    } catch (err) {
      if (err instanceof Error && err.message.trim()) {
        setError(err.message)
      } else {
        setError('No se pudo iniciar sesión.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <IonPage>
      <IonContent fullscreen className="ion-padding">
        <div
          style={{
            minHeight: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px 0',
          }}
        >
          <IonCard
            style={{
              width: '100%',
              maxWidth: 520,
              borderRadius: 24,
              overflow: 'hidden',
              boxShadow: '0 16px 40px rgba(15, 23, 42, 0.14)',
            }}
          >
            <IonCardHeader>
              <IonCardTitle
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  textAlign: 'center',
                }}
              >
                Control de Accesos
              </IonCardTitle>
            </IonCardHeader>

            <IonCardContent>
              <div
                style={{
                  marginBottom: 16,
                  padding: 14,
                  borderRadius: 18,
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <IonIcon icon={tabletPortraitOutline} style={{ fontSize: 24, color: '#2563eb' }} />
                <div>
                  <div style={{ fontWeight: 700, color: '#1e3a8a' }}>Tablet identificada</div>
                  <div style={{ fontSize: '0.95rem', color: '#334155' }}>{tabletLabel}</div>
                </div>
              </div>

              <IonText color="medium">
                <p
                  style={{
                    marginTop: 0,
                    marginBottom: 18,
                    lineHeight: 1.45,
                    textAlign: 'center',
                  }}
                >
                  Ingresa con tu usuario para registrar entradas y salidas.
                </p>
              </IonText>

              <form onSubmit={handleSubmit}>
                <IonItem
                  style={{
                    '--border-radius': '16px',
                    '--inner-padding-end': '12px',
                    marginBottom: 12,
                  }}
                >
                  <IonLabel position="stacked">Correo</IonLabel>
                  <IonInput
                    type="email"
                    value={email}
                    onIonInput={(event) => setEmail(String(event.detail.value ?? ''))}
                    placeholder="guardia@empresa.com"
                    autocomplete="username"
                  />
                </IonItem>

                <IonItem
                  style={{
                    '--border-radius': '16px',
                    '--inner-padding-end': '12px',
                    marginBottom: 12,
                  }}
                >
                  <IonLabel position="stacked">Contraseña</IonLabel>
                  <IonInput
                    type="password"
                    value={password}
                    onIonInput={(event) => setPassword(String(event.detail.value ?? ''))}
                    placeholder="Ingresa tu contraseña"
                    autocomplete="current-password"
                  />
                </IonItem>

                {error && (
                  <div
                    style={{
                      marginTop: 12,
                      marginBottom: 12,
                      padding: 12,
                      borderRadius: 16,
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#b91c1c',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                    }}
                  >
                    {error}
                  </div>
                )}

                <IonButton
                  type="submit"
                  expand="block"
                  disabled={submitting}
                  style={{
                    marginTop: 8,
                    '--border-radius': '16px',
                    height: 54,
                    fontSize: '1rem',
                    fontWeight: 700,
                  }}
                >
                  {submitting ? 'Entrando...' : 'Entrar'}
                </IonButton>
              </form>

              <div
                style={{
                  marginTop: 18,
                  display: 'grid',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: 12,
                    borderRadius: 16,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <IonIcon icon={personCircleOutline} style={{ fontSize: 22, color: '#475569' }} />
                  <IonText color="medium">
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>
                      Usa tu cuenta de <strong>GUARD</strong>, <strong>SUP</strong> o{' '}
                      <strong>ADMIN</strong>.
                    </p>
                  </IonText>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: 12,
                    borderRadius: 16,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <IonIcon icon={lockClosedOutline} style={{ fontSize: 22, color: '#475569' }} />
                  <IonText color="medium">
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>
                      Aunque no haya internet, la tablet seguirá guardando capturas para
                      sincronizarlas después.
                    </p>
                  </IonText>
                </div>
              </div>
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  )
}

export default LoginPage
