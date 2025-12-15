'use client';
import { useContext } from "react";
import { SocketContext } from "@/app/components/SocketContext";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { useRouter } from "next/navigation";
import Player from "../components/Player";
import { Song } from "@/app/types";
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
export default function Page() {
    const socketCtx = useContext(SocketContext);
    const params = useParams();
    const { vault_id } = params as { vault_id: string };
    const [currentSong, setCurrentSong] = useState<Song | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [page, setPage] = useState<"Songs" | "Playlists">("Songs");
    const [createPlaylistOverlay, setCreatePlaylistOverlay] = useState<boolean>(false);
    const router = useRouter();
    const user = auth.currentUser;
    if (!socketCtx?.socket || !socketCtx?.socket.current?.connected) {
        console.log("redirecting")
        router.push(`/app/player/connect/${vault_id}`);
    }
    return socketCtx && (
            <div className="absolute h-screen w-screen top-0 flex justify-items-start"
                style={{height: window.innerHeight}}  
            >
                <div className="absolute right-0 w-screen h-full max-h-full md:relative md:w-[50%] sm:h-screen flex flex-col bg-black/30 rounded-lg p-5 justify-items-center">
                    <h1>{socketCtx?.data.name.current}</h1>
                    <div className="h-1 w-full bg-white/30"></div>
                    <div className="flex">
                        <Dialog onOpenChange={setCreatePlaylistOverlay}>
                            <DropdownMenu>
                                <DropdownMenuTrigger className="bg-transparent p-2 my-2 rounded-lgborder border-white hover:bg-black hover:border-black hover:text-white hover:cursor-pointer">
                                    <div><Plus /></div>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DialogTrigger asChild>
                                        <DropdownMenuItem onClick={() => setCreatePlaylistOverlay(true)}>
                                            Create playlist
                                        </DropdownMenuItem>
                                    </DialogTrigger>
                                    <DropdownMenuItem>
                                        Upload songs
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <div className={`${createPlaylistOverlay ? "fixed fade-in flex top-0 left-0 h-screen w-screen bg-black/30 items-center justify-center z-1000" : "hidden"}`}>
                                <CreatePlaylist exit={() => {setCreatePlaylistOverlay(false)}} />
                            </div>
                        </Dialog>
                        
                    </div>
                    
                    <div className="scrollbar bg-gray rounded-lg mx-auto bottom-0 w-full h-full overflow-y-auto p-8 flex flex-col gap-4">
                        <div className="p-2 rounded-lg m-0 top-0 bg-black flex flex-col justify-center gap-4">
                            <div className="flex justify-center gap-4">
                                <button className={`${page === "Songs" ? "font-bold bg-amber-100 text-black" : ""}`} onClick={() => setPage("Songs")}>Songs</button>
                                <button className={`${page === "Playlists" ? "font-bold bg-amber-100 text-black" : ""}`} onClick={() => setPage("Playlists")}>Playlists</button>
                            </div>
                            <input type="text" placeholder="Search..." onKeyDown={(e) => {
                                setSearchTerm(e.currentTarget.value);
                            }}></input>
                        </div>
                        { page === "Songs" ? <Songs searchTerm={searchTerm} setCurrentSong={setCurrentSong} /> : <Playlists />}
                        
                        
                    </div>
                    <div>
                        <div className="flex md:absolute bottom-0 md:p-5 md:items-center md:left-[50vw] w-full md:h-screen md:w-[50vw] items-start">
                            <div className="fade-in h-full w-full flex flex-col items-start justify-start gap-4">
                                { currentSong ? <Player currentSong={currentSong} /> : <p>No song playing</p> }
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