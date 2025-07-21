import { useRef, useState, useEffect } from 'react';
import { Loading } from './Loading';
import { Header } from './Header';
import type { Options, Room, AuthState } from '../types/types';
import { SideOverlay } from './SideOverlay';
import Notification from './Notification';
export function Manager({settings, setSettings, authState, signOut}: {settings: Options, setSettings: (settings: Options) => void, authState: AuthState, signOut: () => void}) {
    
    const [selector, setSelector] = useState<"GENERAL" | "ROOMS" | "USERS">("GENERAL");
    const [vaultStatus, setVaultStatus] = useState<"online" | "offline" | "error">("offline");
    const [toggleVault, setToggleVault] = useState<boolean>(false);
    const [roomEditOverlay, setRoomEditOverlay] = useState<Room | undefined>(undefined);
    const [roomName, setRoomName] = useState<string>("");
    const [currentVaultName, setCurrentVaultName] = useState<string>(settings.name || "Untitled Vault");
    const [vaultName, setVaultName] = useState<string>(settings.name || "Untitled Vault");
    const [roomDirs, setRoomDirs] = useState<string[]>([]);
    const [roomFolder, setRoomFolder] = useState<string | null>(null);
    const [loading, setLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [signOutOverlay, setSignOutOverlay] = useState<boolean>(false);
    const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: window.innerWidth, height: window.innerHeight });
    const [divSize, setDivSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'warning'; } | null>(null);
    const infoRef = useRef<HTMLDivElement>(null);
    const playerCardRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);

    function changeSettings() {
        console.log("Changing settings...");
        if (!settings) {
            console.error("Settings are not defined");
            return;
        }
        settings.name = vaultName;
        for (const room of settings.rooms) {
            if (room.id === roomEditOverlay?.id) {
                room.name = roomName;
                room.dirs = [roomFolder!];
            }
        }
        console.log("Updated settings:", settings);
        setSettings(settings);
    }
    

    useEffect(() => {
        window.electronAPI.serverStatus().then((status: "online" | "offline" | "error") => {
            console.log("Server status:", status);
            setVaultStatus(status);
        });
    }, []);
    useEffect(() => {
        console.log("Vault toggled:", toggleVault);
        if (vaultStatus === "offline" && toggleVault) {
            setLoading("Starting server...");
            window.electronAPI.startServer().then((success) => {
                if (success) {
                    setVaultStatus("online");
                    setToggleVault(false);
                } else {
                    setVaultStatus("error");
                    setError("Failed to start the server");
                    setToggleVault(false);
                }
                setLoading(null);
            });
        } else if (toggleVault) {
            setLoading("Stopping server...");
            window.electronAPI.stopServer().then((success) => {
                if (success) {
                    setVaultStatus("offline");
                    setToggleVault(false);
                } else {
                    setVaultStatus("error");
                    setError("Failed to start the server");
                    setToggleVault(false);
                }
                setLoading(null);
            });
        }
    }, [toggleVault, vaultStatus]);

    useEffect(() => {
        if (roomEditOverlay) {
            setRoomName(roomEditOverlay.name);
            setRoomFolder(roomEditOverlay.dirs[0] || null);
        } else {
            setRoomName("");
            setRoomFolder(null);
        }
    }, [roomEditOverlay]);
    
    useEffect(() => {
        console.log(signOutOverlay);
    }, [signOutOverlay]);
    

    
    
    const addRoomFolder = async () => {
        const folder = await window.electronAPI.promptForFolder();
        if (folder) {
            setRoomFolder(folder);
        }
    };
    const editRoom = () => {
        if (roomEditOverlay) {
            roomEditOverlay.name = roomName;
            roomEditOverlay.dirs = [roomFolder!];
            const index = settings.rooms.findIndex(r => r.id === roomEditOverlay.id);
            if (index !== -1) {
                settings.rooms[index] = roomEditOverlay;
            }
            else {
                settings.rooms[index] = roomEditOverlay;
            }
            setRoomEditOverlay(undefined);
        }
    };
    const roomEditOverlayElement = (
        <SideOverlay isOpen={roomEditOverlay !== undefined} onClose={() => setRoomEditOverlay(undefined)}>
                <h2>Edit Room</h2>
                <input
                    type="text"
                    className="text_input"
                    placeholder="Enter room name"
                    onChange={(e) => setRoomName(e.target.value)}
                    value={roomName}
                    
                />
                
                { roomFolder ? <p><strong>Room Folder:</strong> {roomFolder}</p> : <p>No room folder selected</p>}
                <button onClick={addRoomFolder}>Select a folder with songs</button>
                
                { (roomFolder && roomName) ? <button style={{fontWeight: 'bold'}}onClick={() => {
                    editRoom();
                    setRoomEditOverlay(undefined);
                }}>Edit Room</button> : null }
        </SideOverlay>
    );
    const errorOverlayElement = (
        <SideOverlay isOpen={error !== null} onClose={() => setError(null)}>
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={() => setError(null)}>Close</button>
        </SideOverlay>
    );
    const signOutOverlayElement = (
        <SideOverlay isOpen={signOutOverlay} onClose={() => {setSignOutOverlay(false)}}>
            <h2>Sign Out</h2>
            <p>Signing out will remove this Vault from your account. </p>
            <p>Are you sure you want to sign out?</p>
            <button onClick={() => {
               signOut();
            }}>Sign Out</button>
        </SideOverlay>
    );

    const rooms = settings.rooms.map((room) => {
        return (
            <div className='player-list-item' key={room.id}>
                <div style={{textAlign: 'left'}}>
                    <h3>{room.name}</h3> 
                    <small>ID: {room.id}</small>
                </div>
                <button style={{marginLeft: 'auto'}} onClick={() => setRoomEditOverlay(room)}>Edit</button>
            </div>
        );
    }); 
    const general = (
        <div className="general">
            <div className='player-list-item'>
                <h3>Vault status</h3>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '5px', marginLeft: 'auto' }}>
                          <div
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: vaultStatus === 'online' ? 'green' : 'gray',
                            marginRight: '8px',
                          }}
                          ></div>
                          <span>{vaultStatus === 'online' ? 'Online' : 'Offline'}</span>
                          { vaultStatus === 'offline' ? ( <button onClick={() => setToggleVault(true)}>Go online</button>) : 
                          vaultStatus === 'error' ? ( <button className='danger'>Restart</button>) : 
                          ( <button className='danger' onClick={() => setToggleVault(true)}>Go offline</button>) }
                </div>
                
            </div>
            <div className='player-list-item'>
                    <h3>Vault name </h3>
                    <div style={{marginLeft: 'auto'}}>
                        <input
                        type="text"
                        className="text_input"
                        placeholder="Enter vault name"
                        value={vaultName}
                        onChange={(e) => {
                            setVaultName(e.target.value);
                        }}
                    />
                    <button onClick={() => {
                        
                        setCurrentVaultName(vaultName);
                        changeSettings();
                    }}>Save</button>
                    </div>
                </div>
        </div>
    );

    useEffect(() => {
        const handleResize = () => {
            setDimensions({ width: window.innerWidth, height: window.innerHeight });
        };
        window.addEventListener('resize', handleResize);
        handleResize(); // Set initial dimensions
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    useEffect(() => {
        if (infoRef.current && playerCardRef.current && headerRef.current) {
            const headerPlayerDistance = Math.abs(headerRef.current.getBoundingClientRect().bottom - playerCardRef.current.getBoundingClientRect().top);
            infoRef.current.style.height = headerPlayerDistance + 'px';
            for (const child of infoRef.current.children) {
                (child as HTMLElement).style.marginTop = '0px';
            }
            const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                setDivSize({ width, height });
            }
        });
        resizeObserver.observe(playerCardRef.current);
        return () => {
            resizeObserver.disconnect();
        };
    }
    }, [dimensions, divSize, loading]);

    return loading ? (<Loading text={loading} />) : (
        <>
        {notification ? <Notification message={notification.message} type={notification.type} dismiss={() => setNotification(null)} /> : null}
        {signOutOverlay ? signOutOverlayElement : null}
        {error ? errorOverlayElement : null}
        {roomEditOverlay ? roomEditOverlayElement : null}
        <Header ref={headerRef}>
            <p>{authState.user?.displayName}</p>
            <button className='danger' onClick={() => setSignOutOverlay(true)}>Sign out</button>
        </Header>
        <div ref={infoRef} className="info">
            <div>
                <h1>{currentVaultName}</h1>
                <p>Manage your vault</p>
            </div>
            
        </div>
        <div ref={playerCardRef} className="player-card" style={{alignItems: 'left'}}>
            <div className='switcher'>
                    <button onClick={() => setSelector("GENERAL")}
                        style={{ backgroundColor: selector === "GENERAL" ? '#ffffff' : 'transparent', color: selector === "GENERAL" ? '#000000' : '#ffffff' }}>
                        General</button>
                    <button onClick={() => setSelector("ROOMS")}
                        style={{ backgroundColor: selector === "ROOMS" ? '#ffffff' : 'transparent', color: selector === "ROOMS" ? '#000000' : '#ffffff' }}>
                        Rooms</button>
                    <button onClick={() => setSelector("USERS")}
                        style={{ backgroundColor: selector === "USERS" ? '#ffffff' : 'transparent', color: selector === "USERS" ? '#000000' : '#ffffff' }}>
                        Users</button>
            </div>
            { selector === "GENERAL" ? general : selector === "ROOMS" ? rooms : <div>Playlists</div>}
        </div>
        </>
        
    );
}