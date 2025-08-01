import { useRef, useState, useEffect, useContext } from 'react';
import { Loading } from './Loading';
import { Header } from './Header';
import type { Options, Room, AuthState, User, PendingRequest, NotificationSetter } from '../types/types';
import { SideOverlay } from './SideOverlay';
import { NotificationContext } from './NotificationContext';
import { AuthContext } from './AuthContext';

export function Manager({settings, setSettings}: {settings: Options, setSettings: (settings: Options) => Promise<boolean>}) {
    
    const [selector, setSelector] = useState<"GENERAL" | "ROOMS" | "USERS">("GENERAL");
    const [vaultStatus, setVaultStatus] = useState<"online" | "offline" | "error">("offline");
    const [toggleVault, setToggleVault] = useState<boolean>(false);
    const [roomOverlay, setRoomOverlay] = useState<Room | null | undefined>(undefined);
    const [roomName, setRoomName] = useState<string>("");
    const [currentVaultName, setCurrentVaultName] = useState<string>(settings.name || "Untitled Vault");
    const [vaultName, setVaultName] = useState<string>(settings.name || "Untitled Vault");
    const [roomFolder, setRoomFolder] = useState<string | null>(null);
    const [loading, setLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [signOutOverlay, setSignOutOverlay] = useState<boolean>(false);
    const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: window.innerWidth, height: window.innerHeight });
    const [divSize, setDivSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
    const setNotification = useContext(NotificationContext) as NotificationSetter;
    const {authState, setAuthState} = useContext(AuthContext) as { authState: AuthState; setAuthState: React.Dispatch<React.SetStateAction<AuthState>> };

    const [loadingOverlay, setLoadingOverlay] = useState<string | false>(false);
    const [usersOverlay, setUsersOverlay] = useState<boolean>(false);
    const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
    const [requestsOverlay, setRequestsOverlay] = useState<boolean>(false);
    const [userEmail, setUserEmail] = useState<string>("");
    const [users, setUsers] = useState<User[]>([]);
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
            if (room.id === roomOverlay?.id) {
                room.name = roomName;
                room.dirs = [roomFolder!];
            }
        }
        console.log("Updated settings:", settings);
        setLoading("Saving settings...");
        setSettings(settings).then(() => {
            setLoading(null);
            setNotification({ message: "Settings saved successfully", type: 'success' });
            console.log("Settings saved successfully");
        }).catch((error) => {
            console.error("Error saving settings:", error);
            setLoading(null);
            setNotification({ message: "Failed to save settings", type: 'error' });
        });

    }

    function getUsers() {

        window.electronAPI.getUsers().then((data) => {
            setUsers(data.users);
            console.log("Fetched users:", data);
        }).catch((error) => {
            console.error("Error fetching users:", error);
            setNotification({ message: "Failed to fetch users", type: 'error' });
        });
    }

    function getPendingRequests() {
        window.electronAPI.getPendingRequests().then((data) => {
            if (data.status === "success") {
                setPendingRequests(data.requests);
                console.log("Fetched pending requests:", data);
            } else {
                console.error("Failed to fetch pending requests:", data);
                setNotification({ message: "Failed to fetch pending requests", type: 'error' });
            }
        }).catch((error) => {
            console.error("Error fetching pending requests:", error);
            setNotification({ message: "Failed to fetch pending requests", type: 'error' });
        });
    }

    function signOut(): Promise<void> {
        return new Promise((resolve, reject) => {
            window.electronAPI?.signOut().then(() => {
            setAuthState({ authenticated: false });
            resolve();
            }).catch(reject);
        });
    }

    

    useEffect(() => {
        getUsers();
        window.electronAPI.serverStatus().then((status: "online" | "offline" | "error") => {
            console.log("Server status:", status);
            setVaultStatus(status);
        });
        getPendingRequests();
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
        if (roomOverlay) {
            setRoomName(roomOverlay.name);
            setRoomFolder(roomOverlay.dirs[0] || null);
        } else {
            setRoomName("");
            setRoomFolder(null);
        }
    }, [roomOverlay]);
    
    useEffect(() => {
        console.log(signOutOverlay);
    }, [signOutOverlay]);

    useEffect(() => {
        if (requestsOverlay) {
            console.log("Fetching pending requests...");
            setLoadingOverlay("Loading pending requests...");
            window.electronAPI.getPendingRequests().then((data) => {
                setPendingRequests(data.requests);
                setLoadingOverlay(false);
                console.log("Fetched pending requests:", data);
            }).catch((error) => {
                console.error("Error fetching pending requests:", error);
                setPendingRequests([]);
                setNotification({ message: "Failed to fetch pending requests", type: 'error' });
                setRequestsOverlay(false); // Close the overlay on error
            });
        }
    }, [requestsOverlay]);
    
    
    const addRoomFolder = async () => {
        const folder = await window.electronAPI.promptForFolder();
        if (folder) {
            setRoomFolder(folder);
        }
    };
    const editRoom = () => {
        if (roomOverlay) {
            roomOverlay.name = roomName;
            roomOverlay.dirs = [roomFolder!];
            const index = settings.rooms.findIndex(r => r.id === roomOverlay.id);
            if (index !== -1) {
                settings.rooms[index] = roomOverlay;
            }
            else {
                settings.rooms[index] = roomOverlay;
            }
            setRoomOverlay(undefined);
        }
    };

    const createRoom = () => {
        if (!roomName || !roomFolder) {
            setError("Please enter a room name and select a folder");
            return;
        }
        const newRoom: Room = {
            name: roomName,
            dirs: [roomFolder],
        };
        setSettings({
            ...settings,
            rooms: [...settings.rooms, newRoom],
        });
        setRoomOverlay(undefined);
        setRoomName("");
        setRoomFolder(null);
        
    };
    const cancelRequest = (email: string) => {
        setLoadingOverlay("Cancelling request...");
        window.electronAPI.cancelRequest(email).then((response) => {
            if (response.status === "success") {
                setNotification({ message: response.message, type: 'success' });
                getPendingRequests();
                setLoadingOverlay(false);
            } else {
                setNotification({ message: response.message, type: 'error' });
            }
        }).catch((error) => {
            console.error("Error cancelling request:", error);
            setNotification({ message: "Failed to cancel request", type: 'error' });
        });
    };

    const addUser = () => {
        if (!userEmail) {
            setError("Please enter a user email");
            return;
        }
        setLoadingOverlay("Inviting user...");
        window.electronAPI.inviteUser(userEmail).then((response) => {
            setLoadingOverlay(false);
            if (response.status === "success") {
                setNotification({ message: response.message, type: 'success' });
                setUserEmail("");
                setUsersOverlay(false);
                getPendingRequests();
            } else {
                setNotification({ message: response.message, type: 'error' });
                setUsersOverlay(false);
            }
        }).catch((error) => {
            setLoadingOverlay(false);
            setNotification({ message: "Failed to invite user", type: 'error' });
            console.error("Error inviting user:", error);
        });
    };
    const roomOverlayElement = (
        <SideOverlay isOpen={roomOverlay !== undefined} onClose={() => setRoomOverlay(undefined)}>
                <h2>{roomOverlay ? "Edit" : "Create"} Room</h2>
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
                    if (roomOverlay) {
                        editRoom();
                    } else {
                        createRoom();
                    }
                    setRoomOverlay(undefined);
                }}>{roomOverlay ? "Edit" : "Create"} Room</button> : null }
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
    const requestsOverlayElement = (
        <SideOverlay isOpen={requestsOverlay} onClose={() => setRequestsOverlay(false)}>
           { loadingOverlay ? <Loading text={loadingOverlay} /> : (
            <>
            <h2>Pending invites to join</h2>
            <div className='mini-player-card'>
                    <div className='player-card'> 
                        { pendingRequests.map((request, index) => {
                                return (
                                    <div key={index} className='player-list-item'>
                                        {request.email}
                                        <button className='danger' onClick={() => cancelRequest(request.email)}>Cancel</button>
                                    </div>

                                );
                        }) }
                    </div>

            </div>
            </>
           ) }
           
           
        </SideOverlay>
    );
    const usersOverlayElement = (
        <SideOverlay isOpen={usersOverlay} onClose={() => setUsersOverlay(false)}>
            {loadingOverlay ? <Loading text={loadingOverlay} /> : (
                <>
                <h2>Add a user</h2>
                <a>Learn more about inviting users</a>
                <p>Enter the email of the user you want to invite:</p>
                <input
                    type="email"
                    className="text_input"
                    placeholder="Enter user email"
                    onChange={(e) => {
                        // Handle email input change
                        setUserEmail(e.target.value);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            addUser();
                        }
                    }}
                    value={userEmail}
                />
                <button onClick={() => {
                    if (!userEmail) {
                        setError("Please enter a user email");
                        return;
                    }
                    addUser();
                }}>Invite</button>
                </>
            )}
        </SideOverlay>
    );
    const rooms = (
        <>
        <div className='player-list-item' onClick={() => {
            setRoomOverlay(null);
        }}>
            <h3><span style={{ fontSize: '24px', marginLeft: '0', marginRight: '1rem' }}>+</span>Add a new room</h3>
            
        </div>
        {settings.rooms.map((room: Room) => {
            return (
                <div className='player-list-item' key={room.id}>
                    <div style={{textAlign: 'left'}}>
                        <h3>{room.name}</h3> 
                        <small>ID: {room.id}</small>
                    </div>
                    <button style={{marginLeft: 'auto'}} onClick={() => setRoomOverlay(room)}>Edit</button>
                </div>
            );
        })}
        </>
    );
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

    const usersElement = (
        <>
        { pendingRequests.length > 0 ? (
            <>
                <a onClick={() => setRequestsOverlay(true)}>View pending invites to join</a>
                <hr />
            </>
        ) : null}
        
        <div className='player-list-item' onClick={() => {
            setUsersOverlay(true);
        }}>
            <h3><span style={{ fontSize: '24px', marginLeft: '0', marginRight: '1rem' }}>+</span>Invite a user</h3>
            
        </div>
        {users.map((user: User) => {
            return (
                <div className='player-list-item' key={user.uid}>
                    <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <h3>{user.name}</h3>
                        <small>{user.email}</small>
                        <small>ID: {user.uid}</small>
                    </div>
                    <button className='danger' style={{ marginLeft: 'auto' }} onClick={() => {
                       
                    }}>Remove</button>
                </div>
            );
                    })
        }
        </>
        
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
            const newHeightPercent = Math.min(0.8, 1 - ((headerRef.current.getBoundingClientRect().height + infoRef.current.getBoundingClientRect().height) / window.innerHeight));

            for (const child of infoRef.current.children) {
                (child as HTMLElement).style.marginTop = '0px';
            }
            const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                setDivSize({ width, height });
            }
            playerCardRef.current!.style.height = `${newHeightPercent * 100}vh`;
        });
        resizeObserver.observe(playerCardRef.current);
        return () => {
            resizeObserver.disconnect();
        };
    }
    }, [dimensions, divSize, loading]);

    return loading ? (<Loading text={loading} />) : (
        <>
        { usersOverlay ? usersOverlayElement : null }
        {signOutOverlay ? signOutOverlayElement : null}
        {error ? errorOverlayElement : null}
        {roomOverlay !== undefined ? roomOverlayElement : null}
        {requestsOverlay ? requestsOverlayElement : null}
        <Header ref={headerRef}>
            <p>{authState.user?.displayName}</p>
            <button onClick={() => {window.location.reload()}}>Refresh</button>
            <button className='danger' onClick={() => setSignOutOverlay(true)}>Sign out</button>
        </Header>
        <div ref={infoRef} className="info">
            <div>
                <h1>{currentVaultName}</h1>
                <small>ID: {authState.id}</small>
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
            { selector === "GENERAL" ? general : selector === "ROOMS" ? rooms : usersElement}
        </div>
        </>
        
    );
}