import { useEffect, useRef, useState } from 'react'
import './App.css'
import { Auth } from './components/Auth';
import { Overlay } from './components/Overlay';

// Firebase imports
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider,signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import Home from './Home';

const firebaseConfig = {

  apiKey: "AIzaSyC439NjyzKYxiYall0lynM2sYFMf6uVXk8",
  authDomain: "vaulttunemusic.firebaseapp.com",
  databaseURL: "https://vaulttunemusic-default-rtdb.firebaseio.com",
  projectId: "vaulttunemusic",
  storageBucket: "vaulttunemusic.firebasestorage.app",
  messagingSenderId: "285722814293",
  appId: "1:285722814293:web:023ad42941cfbd66d3f1dc",
  measurementId: "G-2Z2QRQD7J7"

};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.useDeviceLanguage();

function hasCallbackFlag(): boolean {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.has("callback");
}


function signIn(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const provider = new GoogleAuthProvider();

    signInWithPopup(auth, provider)
      .then((result) => {
        // const credential = GoogleAuthProvider.credentialFromResult(result);
        // const token = credential?.accessToken;

        const user = result.user;
        console.log("User signed in:", user);
        resolve();
      }).catch((error) => {

        const errorCode = error.code;
        const errorMessage = error.message;

        const email = error.customData.email;
        const credential = GoogleAuthProvider.credentialFromError(error);
        console.error("Error signing in:", errorCode, errorMessage, email, credential);
        reject(errorMessage);
      });
  });
}

function signOut(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    auth.signOut()
      .then(() => {
        console.log("User signed out");
        resolve();
      })
      .catch((error) => {
        console.error("Error signing out:", error);
        reject(error);
      });
  });
}
  

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);
  const [callbackState, setCallbackState] = useState<"success" | "loading" | "fail" | undefined>(undefined);
  
  const authState = useRef(false);
  
  
  useEffect(() => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log("User is signed in:", user);
        if (hasCallbackFlag() && !authState.current) {
          authState.current = true;
          setCallbackState("loading");
          console.log("User signed in, sending token to server");
          console.log("Token:", await user.getIdToken());
          const token = await user.getIdToken();
          fetch("http://localhost:3000/auth", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ token, api: "https://api.vaulttune.jcamille.dev" }),
          }).then(async (response) => {
            if (!response.ok) {
              setCallbackState("fail");
              setError(`Failed to authenticate: ${response.statusText}`);
            } else {
              setCallbackState("success");
            }
            const text = await response.text();
            console.log(text);
            return text;
          });
        } 
        setUser(user);
      } else {
        console.log("No user is signed in.");
        setUser(null);
      }
    });
  }, []);
  if (hasCallbackFlag()) {
    if (callbackState === "loading") {
      return (
        <Overlay>
          <h1>Signing in...</h1>
          <p>Please wait while we authenticate you.</p>
        </Overlay>
      );
    } else if (callbackState === "success") {
      return (
        <div className='card-container'>
          <div className="card">
            <h1>VaultTune</h1>
            <h2>Sign in to vault sucessful! You may close this window.</h2>
          </div>
        </div>
      );
    } else if (callbackState === "fail") {
      return (
        <Overlay>
          <h1>Sign in failed</h1>
          <p>{error}</p>
          <button onClick={() => { setCallbackState(undefined) }}>Exit</button>
        </Overlay>
      );
    } else {
      return ( <Auth title="Sign in to your Vault" signIn={signIn} /> );
    }
  }
  return user ? (<Home user={user} signOut={signOut}/>) : (<Auth title="Sign in to VaultTune" signIn={signIn} />);
}



export default App;
