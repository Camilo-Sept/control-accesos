import React from 'react'
import { Redirect, Route } from 'react-router-dom'
import {
  IonApp,
  IonContent,
  IonPage,
  IonRouterOutlet,
  IonSpinner,
  IonText,
  setupIonicReact,
} from '@ionic/react'
import { IonReactRouter } from '@ionic/react-router'
import RegistroPage from './pages/RegistroPage'
import LoginPage from './pages/LoginPage'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/useAuth'

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css'

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css'
import '@ionic/react/css/structure.css'
import '@ionic/react/css/typography.css'

/* Optional CSS utils */
import '@ionic/react/css/padding.css'
import '@ionic/react/css/float-elements.css'
import '@ionic/react/css/text-alignment.css'
import '@ionic/react/css/text-transformation.css'
import '@ionic/react/css/flex-utils.css'
import '@ionic/react/css/display.css'

/* Theme variables */
import './theme/variables.css'

setupIonicReact()

function LoadingScreen() {
  return (
    <IonPage>
      <IonContent className="ion-padding">
        <div
          style={{
            minHeight: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 16,
            textAlign: 'center',
          }}
        >
          <IonSpinner name="crescent" />
          <IonText color="medium">
            <p style={{ margin: 0 }}>Cargando sesión...</p>
          </IonText>
        </div>
      </IonContent>
    </IonPage>
  )
}

function AppRoutes() {
  const { isReady, isAuthenticated } = useAuth()

  if (!isReady) {
    return <LoadingScreen />
  }

  return (
    <IonRouterOutlet>
      <Route exact path="/login">
        {isAuthenticated ? <Redirect to="/registro" /> : <LoginPage />}
      </Route>

      <Route exact path="/registro">
        {isAuthenticated ? <RegistroPage /> : <Redirect to="/login" />}
      </Route>

      <Route exact path="/">
        <Redirect to={isAuthenticated ? '/registro' : '/login'} />
      </Route>
    </IonRouterOutlet>
  )
}

const App: React.FC = () => {
  return (
    <IonApp>
      <IonReactRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </IonReactRouter>
    </IonApp>
  )
}

export default App
