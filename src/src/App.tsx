import { useEffect, useState } from 'react';
import { Auth } from './components/Auth';
import './App.css';
function App() {
  const [authState, setAuthState] = useState<boolean>(false);
  useEffect(() => {
    console.log(window.electronAPI?.ping());
    console.log("Checking authentication state...");
    window.electronAPI?.getAuthState().then(setAuthState).catch((error) => {
      console.error("Error fetching auth state:", error);
      setAuthState(false);
    });
  }, []);

  return authState ? null : ( <Auth signIn={async () => {}} title='Sign in to your Vault'/> );
}

export default App;