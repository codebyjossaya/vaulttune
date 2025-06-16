import { useEffect, useState } from 'react'
import './App.css'
import { Connect } from './components/Connect'
import { Socket } from 'socket.io-client';
import { Loading } from './components/Loading';
import { Overlay } from './components/Overlay';
import VaultTunePlayer from './components/Player';

function App() {
  const [socket, setSocket] = useState<Socket | undefined>(undefined);
  const [failed, setFailed] = useState<boolean>(false);
  const [connected, setConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined)
  useEffect(() => { 
    let counter = 0;
    if (socket) {
      socket.on('connect_error', () => {
        counter += 1;
        if (counter > 5) {
          setFailed(true);

        }
      });
      socket.on('connect', () => {
        console.log("connected")
        setConnected(true)
        setFailed(false)
      })
      socket.on('error',(error) => {
        if (error === "Room does not exist") window.location.reload();
        else setError(error);
      })
      socket.on('disconnect', () => {
            console.log("disconnected")
            setError("Disconnected from the Vault")
      })
        
      socket.on('connect_error', () => {
          console.log("connection error")
          setError("Cannot connect to the Vault")
      })
    } 
  }, [socket])

  useEffect(() => {
    if ("serviceWorker" in window.navigator) {
      window.navigator.serviceWorker.register("/service-worker.js")
          .then(() => console.log("Service Worker Registered"))
          .catch(err => console.error("Service Worker Error", err));
    }
  }, [])

  return socket && connected ? <VaultTunePlayer socket={socket} /> : (
    <div className='card-container'>
      {error ? (
                  <Overlay>
                      <h4>An error has occured</h4>.
                      <p>See the details here: {error}</p>
                  </Overlay>
              ) : null}
     <div className='card'>
      <h1>VaultTune</h1>
      {socket ? (failed ? <p color='red'>Your Vault could not be reached. Refresh to try again.</p> : <Loading text={"Connecting to your Vault.."} />) : 
      <Connect setSocket={setSocket} />} 
     </div>
    </div >
  )
}

export default App
