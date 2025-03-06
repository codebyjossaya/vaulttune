import { useEffect, useState } from 'react'
import './App.css'
import { Connect } from './components/Connect'
import { Socket } from 'socket.io-client';
import { Loading } from './components/Loading';
import VaultTunePlayer from './components/Player';

function App() {
  const [socket, setSocket] = useState<Socket | undefined>(undefined);
  const [failed, setFailed] = useState<boolean>(false);
  const [connected, setConnected] = useState<boolean>(false);
  useEffect(() => { 
    let counter = 0;
    if (socket) {
      socket.on('connect_error', () => {
        counter += 1;
        if (counter > 5) {
          setFailed(true);
          socket.removeAllListeners('disconnect')
        }
      });
      socket.on('connect', () => {
        console.log("connected")
        setConnected(true)
        setFailed(false)
      })
    } 
  }, [socket])

  return socket && connected ? <VaultTunePlayer socket={socket} /> : (
    <>
     <div className='card'>
      <h1>VaultTune</h1>
      {socket ? (failed ? <p color='red'>Your Vault could not be reached. Refresh to try again.</p> : <Loading text={"Connecting to your Vault.."} />) : 
      <Connect setSocket={setSocket} />} 
     </div>
    </>
  )
}

export default App
