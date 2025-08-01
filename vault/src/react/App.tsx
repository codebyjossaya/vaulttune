import { useEffect, useState } from 'react';
import { Auth } from './components/Auth';
import './App.css';
import { Manager } from './components/Manager';
import { type Options } from './types/types';
import { NotificationContext } from './components/NotificationContext';
import { AuthContext } from './components/AuthContext';
import { Loading } from './components/Loading';
import { InitialSetup } from './components/InitialSetup';
import type { AuthState } from './types/types';
import Notification from './components/Notification';

function signIn(setAuthState: React.Dispatch<React.SetStateAction<AuthState>>, api: string): Promise<void> {
  return new Promise((resolve, reject) => {
    window.electronAPI?.signIn(api).then((data: AuthState) => {
      setAuthState(data);
      console.log("Sign in successful:", data);
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      data.authenticated ? resolve() : reject();
    }).catch(reject);
  });
}


function PassAuthState({ authState }: { authState: AuthState }) {
  const [settings, setSettings] = useState<Options | null | undefined>(null);

  useEffect(() => {
    window.electronAPI?.serverSettings().then((settings) => {
      if (settings === undefined) {
        setSettings(undefined);
        return;
      }
      setSettings({api: authState.api, ...settings});
      console.log("Server settings:", settings);
    }).catch((error) => {
      console.error("Error fetching server settings:", error);
      setSettings(undefined);
    });
  }, []);

  const updateSettings = (newSettings: Options) => {
    console.log({ ...newSettings});
    setSettings({ ...newSettings});
    return window.electronAPI?.setServerSettings({...newSettings});
  };

  return settings !== null && settings !== undefined ? ( 
    <Manager settings={settings} setSettings={updateSettings} /> 
  ) : ( 
    settings === undefined ? 
      <InitialSetup setOptions={updateSettings} authState={authState}/> : 
      <Loading text="Loading server settings..." /> 
  );
}

function App() {
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'warning'; } | null>(null);
  const [authState, setAuthState] = useState<AuthState>({ authenticated: false });
  const [loading, setLoading] = useState<boolean>(true);
  
  useEffect(() => {
        console.log("Manager component mounted");
        window.electronAPI.setNotificationCallback((message, type) => {
            console.log("Notification received:", message, type);
            setNotification({ message, type });
        });
    }, []);
  useEffect(() => {
    console.log(window.electronAPI?.ping());
    console.log("Checking authentication state...");
    window.electronAPI?.getAuthState().then((data: AuthState) => {
      console.log("Auth state:", data);
      setAuthState(data);
      setLoading(false);
    }).catch((error) => {
      console.error("Error fetching auth state:", error);
      setLoading(false);
      console.log("Loading set to false");
      setAuthState({ authenticated: false });
    });
  }, []);

  

  return (
    <NotificationContext.Provider value={setNotification}>
      {notification ? <Notification message={notification.message} type={notification.type} dismiss={() => setNotification(null)} /> : null}
      <AuthContext.Provider value={{ authState, setAuthState }}>
        {authState.authenticated ? (
          <PassAuthState authState={authState} />
        ) : loading ? (
          <Loading text="Loading authentication state..." />
        ) : (
          <Auth signIn={(api) => signIn(setAuthState, api)} title='Sign in to your Vault' />
        )}
      </AuthContext.Provider>
    </NotificationContext.Provider>
  );
}
export default App;
