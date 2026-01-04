import DisplayMode from "@/app/components/DisplayMode";
import { StateContext } from "./StateProvider";
import { useContext, useRef, useState } from "react";
import Image from "next/image";
import { SocketContext } from "@/app/components/SocketContext";
import { EllipsisIcon, ShuffleIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Song } from "@/app/types";
export default function QueueView({setOpen}: {setOpen: (open: boolean) => void}) {
    const stateCtx = useContext(StateContext);
    const socketCtx = useContext(SocketContext)
    const clickRef = useRef<HTMLDivElement>(null);
    const [songs, setSongs] = useState<Song[]>(stateCtx!.queue.songs);

    const buttons = [
        {
            icon: <ShuffleIcon></ShuffleIcon>,
            tooltip: "Shuffle",
            action: () => {
                if (songs.length === 0) return;
                if (stateCtx && socketCtx) {
                    songs.splice(0, stateCtx.queue.index.current!);
                    const shuffledSongs = [...songs].sort(() => Math.random() - 0.5);
                    const currentIndex = shuffledSongs.findIndex((s) => s.id === stateCtx.currentSong?.id);
                    if (currentIndex !== -1) {
                        shuffledSongs.unshift(...shuffledSongs.splice(currentIndex, 1));
                    }
                    stateCtx?.queue.set(shuffledSongs);
                    setSongs(shuffledSongs);

                    
                    // eslint-disable-next-line react-hooks/immutability
                    stateCtx.queue.index.current = 0;
                }
            }
        }
    ]

    return (
        <DisplayMode title="Queue" setOpen={setOpen} buttons={buttons}>
            <div className="flex grow flex-col gap-2 border-0 scrollbar fade-in">
                {songs && songs.length > 0 ? songs.map((song, index) => (
                    <div key={index} id="ref" ref={clickRef} className={`p-4 bg-gray-500/30 rounded-lg hover:bg-gray-600 hover:cursor-pointer flex justify-between ${stateCtx && stateCtx.currentSong && stateCtx.currentSong.id === song.id ? "text-emerald-500" : ""}`} onClick={(e) => {
                        
                        setTimeout(() => {
                            stateCtx?.setCurrentSong(song);
                            stateCtx!.queue.index.current = index;
                            console.log("Song index set to: ", index);
                            stateCtx!.play(song);
                        },100)
                    }}>
                        <div className="flex flex-row justify-between items-center w-full">
                            <div className="flex flex-row text-center items-center gap-2">
                                <Image
                                    src={song.coverImage ? `${socketCtx?.url.current}/photo/${song.id}?socketId=${socketCtx?.socket.current!.id}` : "/placeholder.jpg"}
                                    alt="Album Art"
                                    width={50}
                                    height={50}
                                    className="inline-block mr-4"
                                    unoptimized
                                />
                                <p><strong>{song.title}</strong></p>
                                <p>{song.artists.join(", ")}</p>
                            </div>
                            <div className="flex flex-row items-center justify-center">
                                <p className="text-gray-500">{`${Math.floor(Number(song.duration)/60)}:${Math.floor((song.duration/60 - Math.floor(Number(song.duration)/60))*60)}`}</p>
                                <DropdownMenu onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenuTrigger asChild>
                                        <button className="border-0 hover:underline">
                                            <EllipsisIcon className="hover:underline" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="absolute z-10001" onClick={(e) => {
                                        e.stopPropagation();
                                        e.currentTarget.remove();
                                    }}>
                                        <DropdownMenuItem id="dropdown" onClick={(e) => {
                                            if (stateCtx) {
                                                e.preventDefault();
                                                const index = stateCtx.queue.songs.findIndex((s) => s.id === song.id)
                                                if (index === -1) return;
                                                stateCtx.queue.songs.splice(index, 1)
                                                console.log("Removed song from queue: ", song.title);
                                                if (stateCtx.queue.index.current! <= index) {
                                                    stateCtx.queue.index.current = Math.max(0, stateCtx.queue.index.current! - 1);
                                                }
                                                setSongs([...stateCtx.queue.songs]);
                                            }
                                            
                                        }}>
                                            Remove from queue
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                
                                
                                </DropdownMenu>
                                
                                    
                            </div>
                            
                        </div>
                        
                    </div>
                )) : <p>No songs in queue</p>}
            </div>
        </DisplayMode>
    );
}