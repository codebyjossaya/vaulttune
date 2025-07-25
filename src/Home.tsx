import  { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Loading } from './components/Loading';
import { Overlay } from './components/Overlay';
import VaultTunePlayer from './components/Player';
import { User } from 'firebase/auth';
import { VaultRequest, UserVaultData, userVault } from './types';
import { SideOverlay } from './components/SideOverlay';



function Home({user, signOut}: {user: User | null, signOut: () => Promise<void>}) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [loading, setLoading] = useState<false | string>(false);
  const [connected, setConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [vaults, setVaults] = useState<userVault[]>([]);
  const [currentVault, setCurrentVault] = useState<userVault | undefined>(undefined);
  const [sideOverlay, setSideOverlay] = useState<React.ReactElement | null>(null);
  const [receivedInvites, setReceivedInvites] = useState<VaultRequest[]>([]); // Adjust type as needed
  const [receivedInvitesOverlay, setReceivedInvitesOverlay] = useState<boolean>(false);
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

      const data: {status: "success" | "failed", vaults?: UserVaultData, error?: string} = await response.json();
      if (!response.ok && data.error && !data.vaults) {
        setError(`Failed to fetch vaults: ${data.error}`);
      } else {
        console.log("Vaults fetched successfully:", data.vaults);
       
        const vaults: userVault[] = Object.keys(data.vaults || {}).map((key) => {
          if (key === "requests") return null; // Skip the requests key
          else return data.vaults![key];
        }).filter((vault): vault is userVault => vault !== null); // Filter out null
        setVaults(vaults);
        setReceivedInvites(data.vaults!.requests || []);
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
      if (data.error) {
        throw new Error(data.error);
      }
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

  async function unregisterVault(vault: userVault) {
    if (!vault) {
      setError("Vault ID is required to unregister");
      return;
    }
    setSideOverlay((
      <SideOverlay isOpen={true} onClose={() => setSideOverlay(null)}>
        <div>
          <h2>Unregister Vault</h2>
          <p>Are you sure you want to unregister <strong style={{ fontWeight: 'bold' }}>{vault.vault_name}</strong>?</p>
          <button className='danger'onClick={async () => {
            const token = await user!.getIdToken();
            setSideOverlay(null);
            setLoading("Unregistering vault...");
            fetch(`https://api.jcamille.tech/vaulttune/user/vault/unregister`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                user_token: token,
                vault_id: vault.id,
              }),
            }).then(response => {
              if (!response.ok) {
                throw new Error(`Failed to unregister vault: ${response.statusText}`);
              }
              return response.json();
            }).then(data => {
              console.log("Vault unregistered successfully:", data);
              // Refresh the vaults list after unregistering
              fetchVaults();
            }).catch(error => {
              console.error("Error unregistering vault:", error);
              setError(`Failed to unregister vault: ${error.message}`);
            });
          }}>Yes, Unregister</button>
          <button onClick={() => setSideOverlay(null)}>Cancel</button>
        </div>
        
      </SideOverlay>
    ));
  }

  async function handleInvite(vaultId: string, action: "accept" | "decline") {
    if (!vaultId) {
      setError("Vault ID is required to accept an invite");
      return;
    }
    if (!action || (action !== "accept" && action !== "decline")) {
      setError("Invalid action specified for invite handling");
      return;
    }
    setLoading(`Handling invite: ${action}ing...`);
    fetch(`https://api.jcamille.tech/vaulttune/user/vault/handleRequest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },    
      body: JSON.stringify({
        user_token: await user!.getIdToken(),
        vault_id: vaultId,
        action,
      }),
    }).then(response => {
      if (!response.ok) {
        throw new Error(`Failed to accept invite: ${response.statusText}`);
      }
      return response.json();
    }).then(data => {
      console.log("Invite accepted successfully:", data);
      // Refresh the received invites list after accepting
      fetchVaults();
      setLoading(false);
      setReceivedInvitesOverlay(false);
    }).catch(error => {
      console.error("Error accepting invite:", error);
      setError(`Failed to accept invite: ${error.message}`);
    });
  }
  useEffect(() => { 
    let counter = 0;
    if (socket) {
      socket.on('connect_error', () => {
        setLoading("Reconnecting to vault...");
        counter += 1;
        console.log("connection error")
        if (counter > 5) {

          console.log("Killing socket connection due to repeated errors")
          setError("Cannot connect to the Vault")
          setLoading(false);
          socket.disconnect();
          setSocket(null);
          fetchVaults();
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
      socket.on('disconnect', (reason: string) => {
            console.log("disconnected", reason)
            setConnected(false);
            setLoading(false);
      })
        } 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket])

  useEffect(() => {
    if (user) {
      fetchVaults();
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  useEffect(() => {
    if ("serviceWorker" in window.navigator) {
      window.navigator.serviceWorker.register("/service-worker.js")
          .then(() => console.log("Service Worker Registered"))
          .catch(err => console.error("Service Worker Error", err));
    }
  }, [])

  const receivedInvitesOverlayElement = (
    <>
      <SideOverlay isOpen={receivedInvitesOverlay} onClose={() => setReceivedInvitesOverlay(false)}>
        <h2>Pending Invites</h2>
        <div className='mini-player-card'>
          <div className='player-card'>
            {receivedInvites.map((invite) => (
            <div className='player-list-item' key={invite.owner.uid}>
              <span>{invite.owner.displayName} invited you to join {invite.vault_name}</span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
                <button onClick={() => handleInvite(invite.vault_id, "accept")}>Accept</button>
                <button onClick={() => handleInvite(invite.vault_id, "decline")} className='danger'>Decline</button>
              </div>
            </div>
          ))}
          </div>
        </div>

      </SideOverlay>
    </>
  );
  return socket && connected ? <VaultTunePlayer config={{ socket, user, vault: currentVault, signOut }} /> : (
    <>
    {sideOverlay ? sideOverlay : null}
    {receivedInvitesOverlay ? receivedInvitesOverlayElement : null}


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
                {receivedInvites.length > 0 ? (
                  <>
                  <a onClick={() => setReceivedInvitesOverlay(true)}>View {receivedInvites.length} pending invites</a>
                  <hr />
                  </>
                ) : null}
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
                      { vault.status === 'online' ? <button onClick={() => connectToVault(vault.id)}>Connect</button> : null}
                      <button onClick={() => unregisterVault(vault)} className='danger'>Unregister</button>
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