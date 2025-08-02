import { useEffect, useState } from "react";
import type { Options, Room } from "../types/types"
import { SideOverlay } from "./SideOverlay";
import type { AuthState } from "../types/types";
export function InitialSetup({setOptions, authState}: {setOptions: (options: Options) => void, authState: AuthState}) {
    const [name, setName] = useState<string>("");
    const [roomOverlay, setRoomOverlay] = useState<boolean>(false);

    const [roomName, setRoomName] = useState<string>("");
    const [roomFolder, setRoomFolder] = useState<string | null>(null);
    const [rooms, setRooms] = useState<Room[]>([]);
    
    const [users, setUsers] = useState<string[]>([]);
    const [currentStep, setCurrentStep] = useState<number>(0);
    const [nextReady, setNextReady] = useState<boolean>(true);

    const [networkOverlay, setNetworkOverlay] = useState<boolean>(false);
    const [networkMethod, setNetworkMethod] = useState<"manual" | "tunneling" | undefined>(undefined);

    const [error, setError] = useState<string | undefined>(undefined);


    useEffect(() => {
        console.log("Name or currentStep changed:", name, currentStep);
        if (name.trim() !== "") {
            setNextReady(true);
        } else if (currentStep !== 0) {
            console.log("Name is empty, setting nextReady to false");
            setNextReady(false);
        }
    }, [name, currentStep]);

    useEffect(() => {
        if (roomName.trim() !== "" && roomFolder) {
            setNextReady(true);
        } else if (currentStep !== 0) {
            console.log("Room name or folder is empty, setting nextReady to false");
            setNextReady(false);
        }
    }, [roomName, roomFolder, currentStep]);


    useEffect(() => {
        if (rooms.length > 0) {
            setNextReady(true);
        } else if (currentStep !== 0) {
            console.log("No rooms, setting nextReady to false");
            setNextReady(false);
        }
    }, [rooms, currentStep]);

    useEffect(() => {
        if (currentStep === 3) {
            if (authState.user) {
                setUsers([authState.user.email ? authState.user.email : ""]);
            }
            setNextReady(true);
        }
    }, [currentStep, authState.user]);

    useEffect(() => {
        if (currentStep === 4 && !networkMethod) {
            setNextReady(false);
        }
    }, [currentStep, networkMethod]);




    const addRoomFolder = async () => {
        const folder = await window.electronAPI.promptForFolder();
        if (folder) {
            setRoomFolder(folder);
        }
    };

    const addRoom = () => {
        if (roomName.trim() === "" || !roomFolder) {
            console.error("Room name or folder is empty");
            setError("Room name or folder is empty");
            return;
        }
        const timestamp: string = (new Date()).toISOString();
        const random = Math.floor(Math.random() * 1000000);
        const newRoom: Room = {
            name: roomName,
            id: `room_${timestamp}_${random}`,
            dirs: [roomFolder],
        };
        setRooms([...rooms, newRoom]);
        setRoomName("");
        setRoomFolder(null);
        setRoomOverlay(false);
    }

    const networkOverlayElement = (
        <SideOverlay
            isOpen={networkOverlay}
            onClose={() => setNetworkOverlay(false)}
        >
            <h2>Automatic tunneling with Cloudflare</h2>
            <p>VaultTune provides a built-in tunneling service using Cloudflare. This
                allows you to easily and securely access your vault from outside your network without
                having to configure port forwarding on your router. It is built directly into VaultTune
                and provides a seamless experience.</p>
            <p>Should you elect to use automatic tunneling, you acknowledge that data transmitted by
                your Vault (including song metadata, encrypted user tokens, and other information)
                will be sent through Cloudflare's servers. This data is encrypted and not stored
                by Cloudflare. You also agree to the Cloudflare License, Privacy Policy, and Terms & Conditions.</p>
            <p>For more information, please refer to the <a href="https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/" target="_blank" rel="noopener noreferrer">Cloudflare website</a>.</p>
            <p>Do you wish to continue?</p>
            <button onClick={() => {
                setNetworkMethod("tunneling");
                setNetworkOverlay(false);
                setNextReady(true);
            }}>Yes, use automatic tunneling</button>
            <button onClick={() => {
                setNetworkMethod("manual");
                setNetworkOverlay(false);
                setNextReady(true);
            }}>No, I will set up port forwarding manually</button>
        </SideOverlay>
    );
    const roomOverlayElement = (
        <SideOverlay
            isOpen={roomOverlay}
            onClose={() => setRoomOverlay(false)}
        >
                <h2>Add a Room</h2>
                <input
                    type="text"
                    className="text_input"
                    placeholder="Enter room name"
                    onChange={(e) => setRoomName(e.target.value)}
                    
                />
                
                { roomFolder ? <p><strong>Room Folder:</strong> {roomFolder}</p> : <p>No room folder selected</p>}
                <button onClick={addRoomFolder}>Select a folder with songs</button>
                
                { (roomFolder && roomName) ? <button style={{fontWeight: 'bold'}}onClick={() => {
                    addRoom();
                    setRoomOverlay(false);
                }}>Add Room</button> : null }
                
        </SideOverlay>
    );
    const errorOverlayElement = (
        <SideOverlay isOpen={error !== undefined} onClose={() => setError(undefined)}>
            <div className="api-overlay-content">
                <h2>Error</h2>
                <p>{error}</p>
                <button onClick={() => setError(undefined)}>Close</button>
            </div>
        </SideOverlay>
    );

    const stepDescriptions = [
        (
            <>
                <h2 style={{ marginBottom: '5px' }}>Initial Setup</h2>
                <p>
                    Welcome to VaultTune! Before you can start using the app, please complete the
                    initial setup.
                </p>
            </>
        ),(
            <>
                <h2>Name your Vault</h2>
                <p>Please enter a name for your vault. Make it cool, or don't. I don't really care.</p>
            </>
        ),
        (
            <>
                <h2>Add Rooms</h2>
                <p style={{ fontWeight: 'bold', margin: '0px' }}>What are Rooms?</p>
                <p>Rooms are the different spaces within your vault where you store different songs.
                    Each room is assigned a folder on your computer where the songs are stored.  
                    You can add as many rooms as you like, but you need at least one room to start. </p>
            </>
        ),
        (
            <>
                <h2>Add Users</h2>
                <p>By default, you're the only user in your vault. While not required, you can add 
                more users to your vault.</p>
            </>
        ),
        (
            <>
               <h2>Manual port forwarding or automatic tunneling?</h2>
               <p>To access your Vault outside your network and sync with your VaultTune account,
                   you need to set up port forwarding on your router or use the provided tunneling service, <a onClick={() => console.log("Tunneling service clicked")}>Cloudflare Quick Tunnel</a>.
               </p>
            </>
        )
    ]
    const steps = [
        null,
        (
            <>
                <input
                    type="text"
                    className="text_input"
                    placeholder="Enter vault name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ textAlign: 'center' }}
                />
            </>
        ),
        (<>
            <div className="mini-player-card" >
                <div className="player-card">
                    <div className="player-list-item" onClick={() => {setRoomOverlay(true)}}>
                        <span style={{ fontSize: '24px', margin: '1em' }}>+</span><p style={{fontWeight: 'bold'}}>Add a room</p>
                    </div>
                    {rooms.map((room, index) => (
                        <div key={index} className="player-list-item">
                            <p>{room.name}</p>
                            <button onClick={() => {
                                setRoomName(room.name);
                                setRoomFolder(room.dirs[0]);
                                setRoomOverlay(true);
                            }}
                            style={{ marginLeft: 'auto' }}
                            >Edit</button>
                        </div>
                    ))}
                </div>
            </div>
        </>),
        (
            <>
                <div className="mini-player-card">
                    <div className="player-card">
                        <div className="player-list-item" onClick={() => {

                        }}>
                            <span style={{ fontSize: '24px', margin: '1em' }}>+</span><p style={{fontWeight: 'bold'}}>Add a user</p>
                        </div>
                        {users.map((user, index) => (
                            <div key={index} className="player-list-item">
                                <p>{user} (you)</p>
                                <button onClick={() => {
                                    const newUser = prompt("Edit user name:", user);
                                    if (newUser) {
                                        const updatedUsers = [...users];
                                        updatedUsers[index] = newUser;
                                        setUsers(updatedUsers);
                                    }
                                }}
                                style={{ marginLeft: 'auto' }}
                                >Edit</button>
                            </div>
                        ))}
                    </div>
                </div>
            </>
        ),
        (
            <>
               { networkMethod ? (<div>
                    <p>You selected: {networkMethod}</p>
                    <button onClick={() => {
                        setNetworkMethod(undefined);
                    }}>Change</button>
               </div>) : (
                 <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                    <button onClick={() => setNetworkMethod("manual")}>Manual port forwarding</button>
                    <button onClick={() => setNetworkOverlay(true)}>Automatic tunneling (recommended)</button>
                </div>
               )}
            </>
        )
    ]
    
    if (currentStep >= stepDescriptions.length) {
        return (
            <div className="card-container">
                <div className="card">
                    <h1>Setup Complete</h1>
                    <p>Your vault has been set up successfully!</p>
                    <button onClick={() => setOptions({ name, rooms, users, network: networkMethod == "tunneling" ? true : false })}>Finish Setup</button>
                </div>
            </div>
        );
    }
    
    return (

        <div className="card-container initial-setup">
            {roomOverlay ? roomOverlayElement : null}
            {networkOverlay ? networkOverlayElement : null}
            {error ? errorOverlayElement : null}
            <div className="card" style={{ maxWidth: '50vw' }}>
                <h1>VaultTune</h1>
                <div style={{display: 'flex', flexDirection: 'row', gap: '10px', justifyContent: 'center', alignItems: 'flex-start', maxHeight: '70% !important'}}>
                    <div style={{display: 'flex', alignItems: 'flex-start', flexDirection: 'column', gap: '5px', maxWidth:  "50%", textAlign: 'left', overflowWrap: 'break-word'}}>
                          {stepDescriptions[currentStep]}
                    </div>
                    <div style={{display: 'flex', alignItems: 'center', textAlign: 'center', justifyContent: 'center', flexDirection: 'column', width:  "50%", margin: '10px'}}>
                        {steps[currentStep]}
                    </div>
                    

                </div>
                <div style={{display: 'flex', flexDirection: 'row', gap: '10px', justifyContent: 'flex-start', alignItems: 'flex-start'}}>
                    { currentStep > 0 ? <button onClick={() => {setCurrentStep(currentStep - 1)}}>Previous</button> : null }
                    {nextReady ? <button style={{marginLeft: 'auto'}} onClick={() => {
                        setCurrentStep(currentStep + 1);
                        setNextReady(false);
                    }}>Next</button> : null}
                </div>

                <div className='card-footer'>
                  <p>{authState.user ? authState.user?.displayName : "user user"}</p>
                  <button className='danger' onClick={window.electronAPI.signOut}>Sign out</button>
                </div>
            </div>
            
        </div>
    );
}