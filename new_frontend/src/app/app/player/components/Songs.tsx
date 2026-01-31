import { useContext, useState } from "react";
import { SocketContext } from "@/app/components/SocketContext";
import Image from "./Image";
import { StateContext } from "./StateProvider";
import { DropdownMenu } from "@radix-ui/react-dropdown-menu";
import { EllipsisIcon } from "lucide-react";
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ShareView from "./ShareView";
import { Song } from "@/app/types";
import EditSongView from "./EditSongView";
import Loading from "../../../../components/Loading";
import { OverlayContext } from "@/components/OverlayProvider";
export default function Songs({searchTerm }: {searchTerm: string}) {
    const socketCtx = useContext(SocketContext);
    const stateCtx = useContext(StateContext);
    const overlayCtx = useContext(OverlayContext);
    const [loading, setLoading] = useState<boolean>(false);
    
    const editOverlay = (song: Song) => { 
        
        return loading ? <Loading message="Saving changes..." /> : 
        <EditSongView song={song} setSong={(updatedSong) => {
            console.log("Loading...")
            setLoading(true);
            if (song.coverImage !== updatedSong.coverImage) {
                console.log("editing cover image")
                fetch(updatedSong.coverImage!).then(res => res.blob()).then((blob) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (updatedSong as any).coverImage = blob;
                }).catch((error) => {
                    console.error("Error fetching image:", error);
                }).finally(() => {
                    socketCtx?.socket?.current?.emit('edit song', updatedSong);
                });
            } else {
                socketCtx?.socket?.current?.emit('edit song', updatedSong);
            }
            socketCtx?.socket?.current?.once('song updated', (newSong: Song) => {
                console.log("done!")
                socketCtx.data.setSongs(socketCtx.data.songs.map(s => s.id === newSong.id ? newSong : s));
                if (stateCtx && stateCtx.currentSong && stateCtx.currentSong.id === newSong.id) {
                    stateCtx.setCurrentSong(newSong);
                }
                setLoading(false);
                overlayCtx.clearOverlay();
            });
        }} />
    };

    return socketCtx!.data.songs.sort((a, b) => a.title.localeCompare(b.title)).map((song, index) =>  {
        if (searchTerm && !song.title!.toLowerCase().includes(searchTerm.toLowerCase()) && !song.artists!.some(artist => artist.toLowerCase().includes(searchTerm.toLowerCase()))) {
            return null;
        }
        return (
            <div key={index} className={`fade-in z-1 p-4 bg-gray-500/30 rounded-lg hover:bg-gray-600 hover:cursor-pointer flex justify-between ${stateCtx?.currentSong && stateCtx.currentSong.id === song.id ? "text-emerald-500" : ""}`} onClick={() => {
                if (!stateCtx) return;  
                if (stateCtx.currentSong && stateCtx.currentSong.id === song.id) return;
                stateCtx?.setCurrentSong(undefined);
                
                setTimeout(() => {
                    stateCtx?.play(song);
                    stateCtx?.queue.set([]);   
                    stateCtx!.queue.index.current = null;                 
                },100)
                
                
            }}>

                <div className="flex flex-row justify-between items-center w-full fade-in">
                    
                    <div className="flex flex-row text-center items-center gap-2">
                    <Image
                        src={song.coverImage ? `${socketCtx?.url.current}/photo/${song.id}?socketId=${socketCtx?.socket.current!.id}` : "/placeholder.jpg"}
                        alt="Album Art"
                        width={50}
                        height={50}
                        className="inline-block mr-4 rounded-md"
                        
                    />
                    <p><strong>{song.title}</strong></p>
                    <p>{song.artists.join(", ")}</p>
                    </div>
                    {/* <p className="text-gray-500">{`${Math.floor(Number(song.duration)/60)}:${Math.floor((song.duration/60 - Math.floor(Number(song.duration)/60))*60)}`}</p> */}
                    <DropdownMenu onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuTrigger className="p-2 rounded-lg hover:bg-gray-600 border-0">
                            <EllipsisIcon />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                if (!stateCtx?.queue.index.current && stateCtx?.queue.index.current !== 0) {
                                    stateCtx!.queue.index.current = 0;
                                }
                                
                                if (stateCtx?.queue.songs.length === 0 && stateCtx?.currentSong) {
                                    stateCtx?.queue.set([stateCtx!.currentSong, song]);
                                } else {
                                    stateCtx?.queue.songs.splice(stateCtx.queue.index.current! + 1, 0, song);
                                    stateCtx?.queue.set(stateCtx.queue.songs);
                                }
                              
                               
                            }}>Add to queue</DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                overlayCtx.setOverlay({
                                    title: "Share",
                                    content: <ShareView song={song} />,
                                })
                            }}>Share</DropdownMenuItem>
                            { socketCtx?.data.owner && (

                                <>
                                    <DropdownMenuItem onClick={(e) => {
                                        e.stopPropagation();
                                        overlayCtx.setOverlay({
                                            title: `Edit ${song.title}`,
                                            content: editOverlay(song),
                                        });
                                    }}>Edit</DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => {
                                        e.stopPropagation();
                                        socketCtx?.socket?.current?.emit('delete song', song);
                                        socketCtx?.socket?.current?.once('song removed', (song: Song) => {
                                            socketCtx.data.setSongs(socketCtx.data.songs.filter(s => s.id !== song.id));
                                            if (stateCtx?.currentSong && stateCtx.currentSong.id === song.id) {
                                                stateCtx.setCurrentSong(null);
                                                stateCtx.queue.set([]);
                                                stateCtx.queue.index.current = null;
                                            }
                                        });
                                    }}>Delete</DropdownMenuItem>
                                    
                                </>
                            )}
                            
                        </DropdownMenuContent>
                    </DropdownMenu>

                </div>
                
            </div>
        )})
}