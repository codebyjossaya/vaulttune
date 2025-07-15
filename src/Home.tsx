import  { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Loading } from './components/Loading';
import { Overlay } from './components/Overlay';
import VaultTunePlayer from './components/Player';
import { User } from 'firebase/auth';
import { Vault } from './types';



function Home({user, signOut}: {user: User | null, signOut: () => Promise<void>}) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [loading, setLoading] = useState<false | string>(false);
  const [connected, setConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [currentVault, setCurrentVault] = useState<Vault | undefined>(undefined);
  // const headerRef = useRef<HTMLDivElement>(null);
  // const socketRef = useRef<Socket | undefined>(socket);
  // needs to only exist within this scope

  async function fetchVaults() {
    setLoading("Getting vaults...");
    fetch("https://api.jcamille.tech/vaulttune/user/vaults/get", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_token: await user!.getIdToken(),
      }),
    }).then(async (response) => {
      
      const data = await response.json();
      if (!response.ok) {
        setError(`Failed to fetch vaults: ${data.error}`);
      } else {
        console.log("Vaults fetched successfully:", data.vaults);
        setVaults(Object.values(data.vaults));
      }
      setLoading(false);
      
      
    }).catch((error) => {
      console.error("Error fetching vaults:", error);
      setError("Failed to fetch vaults");
    });
  }

  
  async function connectToVault(id: string) {
    if (!id) {
      setError("Vault ID is required to connect");
      return;
    }
    const token = await user!.getIdToken();
    fetch(`https://api.jcamille.tech/vaulttune/user/vault/connect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_token: token,
        vault_id: id,
      }),
    }).then(response => {
      if (!response.ok) {
        throw new Error(`Failed to connect to vault: ${response.statusText}`);
      }
      return response.json();
    }).then(data => {
      if (!data.vault.tunnel_url) {
        throw new Error("No tunnel URL provided in the response");
      }
      // Set the socket connection using the tunnel URL
      setSocket(io(data.vault.tunnel_url,{
        extraHeaders: {
          "bypass-tunnel-reminder": "true",
        }
      }));
      setLoading("Connecting to vault...");
      setCurrentVault(data.vault);
    }).catch(error => {
      console.error("Error connecting to vault:", error);
      setError(`Failed to connect to vault: ${error.message}`);
    });
  }
  useEffect(() => { 
    let counter = 0;
    if (socket) {
      socket.on('connect_error', () => {
        counter += 1;
        if (counter > 5) {

        }
      });
      socket.on('connect', () => {
        console.log("connected")
        setConnected(true)
      })
      socket.on('error',(error) => {
        if (error === "Room does not exist") window.location.reload();
        else setError(error);
      })
      socket.on('disconnect', () => {
            console.log("disconnected")
            setConnected(false);
            setLoading(false);
      })
        
      socket.on('connect_error', () => {
          console.log("connection error, killing socket")
          setError("Cannot connect to the Vault")
          setLoading(false);
          setSocket(null);
      })
    } 
  }, [socket])

  useEffect(() => {
    if (user) {
      fetchVaults();
    }

  },[]);

  useEffect(() => {
    if ("serviceWorker" in window.navigator) {
      window.navigator.serviceWorker.register("/service-worker.js")
          .then(() => console.log("Service Worker Registered"))
          .catch(err => console.error("Service Worker Error", err));
    }
  }, [])


  return socket && connected ? <VaultTunePlayer config={{ socket, user, vault: currentVault, signOut }} /> : (
    <>
    {error ?  (
                <Overlay>
                    <h1>There was an error</h1>
                    <p>{error}</p>
                    <button onClick={() => {setError(undefined)}}>Exit</button>
                </Overlay>
            ) : null}
      <div className='card-container'>
      <div className="card">
          <h1>VaultTune</h1>
          {loading ? <Loading text={loading} /> : ( 
            <>
                <h3>Your vaults</h3>
                <div className='list'>
                  {vaults.map((vault) => (
                    <div key={vault.id} className='list-item'>
                      <h4>{vault.vault_name}</h4>
                        <small style={{ color: 'gray', display: 'block', marginTop: '-6.8%' }}>ID: {vault.id}</small>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '5px' }}>
                          <div
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: vault.status === 'online' ? 'green' : 'gray',
                            marginRight: '8px',
                          }}
                          ></div>
                          <span>{vault.status === 'online' ? 'Online' : 'Offline'}</span>
                        </div>
                      <button onClick={() => connectToVault(vault.id)}>Connect</button>
                      <button className='danger'>Unregister</button>
                    </div>
                  ))}
                </div>
                <small style={{color: 'gray'}}>Don't see your vault? Try <a onClick={fetchVaults}>refreshing the vault list.</a></small>
                <div className='card-footer'>
                  <p>{user?.displayName}</p>
                  <button className='danger' onClick={() => {signOut()}}>Sign out</button>
                </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
 // add an offline/online indicator to the header
export default Home;