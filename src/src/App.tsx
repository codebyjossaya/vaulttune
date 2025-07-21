import { useEffect, useState } from 'react';
import { Auth } from './components/Auth';
import './App.css';
import { Manager } from './components/Manager';
import type { Options } from './types/types';
import { Loading } from './components/Loading';
import { InitialSetup } from './components/InitialSetup';
import type { AuthState } from './types/types';

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

function signOut(setAuthState: React.Dispatch<React.SetStateAction<AuthState>>): Promise<void> {
  return new Promise((resolve, reject) => {
    window.electronAPI?.signOut().then(() => {
      setAuthState({ authenticated: false });
      resolve();
    }).catch(reject);
  });
}

function PassAuthState({ authState, setAuthState }: { authState: AuthState, setAuthState: React.Dispatch<React.SetStateAction<AuthState>> }) {
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
    window.electronAPI?.setServerSettings({...newSettings}).then((success) => {
      if (success) {
        console.log("Server settings updated successfully.");
      } else {
        console.error("Failed to update server settings.");
      }
    }).catch((error) => {
      console.error("Error updating server settings:", error);
    });
  };

  return settings !== null && settings !== undefined ? ( 
    <Manager authState={authState} settings={settings} setSettings={updateSettings} signOut={() => signOut(setAuthState)} /> 
  ) : ( 
    settings === undefined ? 
      <InitialSetup setOptions={updateSettings} authState={authState}/> : 
      <Loading text="Loading server settings..." /> 
  );
}

function App() {
  const [authState, setAuthState] = useState<AuthState>({ authenticated: false });
  const [loading, setLoading] = useState<boolean>(true);
  
  useEffect(() => {
    console.log(window.electronAPI?.ping());
    console.log("Checking authentication state...");
    window.electronAPI?.getAuthState().then((data: AuthState) => {
      console.log("Auth state:", data);
      setAuthState(data);
      setLoading(false);
    }).catch((error) => {
      console.error("Error fetching auth state:", error);
      setAuthState({ authenticated: false });
    });
  }, []);

  return authState.authenticated ? ( <PassAuthState authState={authState} setAuthState={setAuthState} />) : loading ? ( <Loading text="Loading authentication state..." /> ) : ( <Auth signIn={(api) => signIn(setAuthState, api)} title='Sign in to your Vault' /> );
}
export default App;