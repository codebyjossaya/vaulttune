'use client';
import { SocketContext } from "@/app/components/SocketContext";
import { useParams } from "next/navigation";
import { useState, useContext, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Player from "../components/Player";
import { auth } from "@/lib/firebase/main";
import { signOut } from "firebase/auth";
import { Plus } from "lucide-react";
import Songs from "../components/Songs";
import Playlists from "../components/Playlists";
import { DropdownMenu, DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import { DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import CreatePlaylist from "../components/CreatePlaylist";
import { Dialog } from "@/components/ui/dialog";
import { DialogTrigger } from "@radix-ui/react-dialog";
import { StateContext } from "../components/StateProvider";
import { Skeleton } from "@/components/ui/skeleton";
import UploadSongs from "../components/UploadSongs";

export default function Page() {
    
    const socketCtx = useContext(SocketContext);
    const stateCtx = useContext(StateContext);
    const params = useParams();
    const { vault_id } = params as { vault_id: string };
    if (stateCtx) stateCtx.vault_id!.current = vault_id;
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [page, setPage] = useState<"Songs" | "Playlists">("Songs");
    const [createPlaylistOverlay, setCreatePlaylistOverlay] = useState<boolean>(false);
    const [uploadSongsOverlay, setUploadSongsOverlay] = useState<boolean>(false);
    const [offset, setOffset] = useState<number>(0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).stateCtx = stateCtx;
    const buttonRef = useRef<HTMLButtonElement>(null);
    const router = useRouter();
    const user = auth.currentUser;
    if (!socketCtx?.socket || !socketCtx?.socket.current?.connected) {
        router.push(`/app/player/connect/${vault_id}`);
    }

    useEffect(() => {
        setOffset(socketCtx!.data.songs.length);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socketCtx?.data.songs]);
        
    return socketCtx && (
            
            <div className="absolute h-screen w-screen top-0 flex justify-items-start"
                style={{height: window.innerHeight}}  
            >
                {
                    createPlaylistOverlay && 
                    <div className={`${createPlaylistOverlay ? "fixed fade-in flex top-0 left-0 h-screen w-screen bg-black/30 items-center justify-center z-1000" : "hidden"}`}>
                        <CreatePlaylist exit={() => {setCreatePlaylistOverlay(false)}} />
                    </div>
                }
                {
                    uploadSongsOverlay && <UploadSongs exit={() => {setUploadSongsOverlay(false)}} />
                }
                <div className="fade-in absolute right-0 w-screen h-full max-h-full md:relative md:w-[50%] sm:h-screen flex flex-col bg-black/30 rounded-lg p-5 justify-items-center">
                    <h1>{socketCtx?.data.name.current}</h1>
                    <div className="h-1 w-full bg-white/30"></div>
                    <div className="flex">
                        <Dialog onOpenChange={setCreatePlaylistOverlay}>
                            <DropdownMenu onClick={() => {}}>
                                <DropdownMenuTrigger className="bg-transparent p-2 my-2 rounded-lgborder border-white hover:bg-black hover:border-black hover:text-white hover:cursor-pointer">
                                    <div><Plus /></div>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DialogTrigger asChild>
                                        <DropdownMenuItem onClick={() => setCreatePlaylistOverlay(true)}>
                                            Create playlist
                                        </DropdownMenuItem>
                                    </DialogTrigger>
                                    <DropdownMenuItem onClick={() => setUploadSongsOverlay(true)}>
                                        Upload songs
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            
                        </Dialog>
                        
                    </div>
                    <div className="scrollbar bg-gray rounded-lg mx-auto bottom-0 w-full h-full overflow-y-auto bg-black/50 flex flex-col gap-4">
                        <div className="sticky top-0 w-full p-2 m-0 bg-black flex flex-col justify-center gap-4">
                            <div className="  flex justify-center gap-4">
                                <button className={`${page === "Songs" ? "font-bold bg-amber-100 text-black" : ""}`} onClick={() => setPage("Songs")}>Songs</button>
                                <button className={`${page === "Playlists" ? "font-bold bg-amber-100 text-black" : ""}`} onClick={() => setPage("Playlists")}>Playlists</button>
                            </div>
                            <input type="text" placeholder="Search..." onKeyUp={(e) => {
                                setSearchTerm(e.currentTarget.value);
                            }}></input>
                        </div>
                        <div className="flex flex-col p-4 gap-4">
                            { page === "Songs" ? 
                            <>
                                <Songs searchTerm={searchTerm}/>
                                {  socketCtx.data.totalSongs.current - socketCtx.data.songs.length > 0 && 
                                    <button ref={buttonRef} onClick={() => {
                                        console.log('click!')
                                        socketCtx!.socket!.current!.emit('get songs', offset);
                                        buttonRef.current!.style.display = 'none';
                                        socketCtx!.socket.current!.once('songs', () => {
                                            console.log('received!')
                                            buttonRef.current!.style.display = '';
                                        });
                                    }}>
                                        Load {socketCtx.data.totalSongs.current - offset > 25 ? 25 : socketCtx.data.totalSongs.current - offset} more songs
                                    </button>
                                }
                            </> : <Playlists />}
                        </div>
                        
                        
                        
                        
                    </div>
                    <div>
                        <div className="flex md:absolute bottom-0 md:p-5 md:items-center md:left-[50vw] w-full md:h-screen md:w-[50vw] items-start">
                            <div className="fade-in h-full w-full flex flex-col items-start justify-start lg:items-center lg:justify-center gap-4">
                                { stateCtx?.currentSong ? <Player /> : stateCtx?.currentSong === undefined ? <Skeleton className="w-full h-20 md:w-96 md:h-96 rounded-lg"/> : null }
                            </div>
                        </div>
                        <div className="w-full bottom-0 left-0 items-center m-0 flex flex-row p-3 justify-between">
                            <p><strong>{user?.displayName}</strong></p>
                            
                            <div className="flex gap-4">
                                <button onClick={() => {
                                    socketCtx.disconnect();
                                    router.push("/app/dashboard/")
                                }}>Disconnect</button>
                                <button className="danger" onClick={() => {
                                    signOut(auth).then(() => {
                                        document.cookie = `auth_token=; path=/; max-age=0`;
                                        router.push('/app/login');
                                    }).catch((error) => {
                                        console.error("Error signing out: ", error);
                                    });
                                }}>Sign out</button>
                            </div>
                        
                        </div>
                    </div>
                    
                </div>
                
                
                
            </div>
        )
}