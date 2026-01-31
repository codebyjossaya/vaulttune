import { StateContext } from "./StateProvider";
import { useContext, useRef, useState } from "react";
import Image from "next/image";
import { SocketContext } from "@/app/components/SocketContext";
import { EllipsisIcon, GripHorizontal, ShuffleIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Song } from "@/app/types";
import { OverlayContext } from "@/components/OverlayProvider";

export default function QueueView() {
    const stateCtx = useContext(StateContext);
    const socketCtx = useContext(SocketContext)
    const overlayCtx = useContext(OverlayContext);
    const boundRef = useRef<HTMLDivElement>(null);
    const [songs, setSongs] = useState<Song[]>([...stateCtx!.queue.songs]);
    const storedRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
    const [dragging, setDragging] = useState<string | null>(null);
    const draggingRef = useRef<string | null>(dragging);
    console.log('rendering...')
    console.log('dragging ref: ', draggingRef.current);
    
    overlayCtx.setButtons([
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
    ]);
    

    const handleRef = ( id: string, element: HTMLDivElement | null) => {
        if (element) {
            storedRefs.current[id] = element;
        } else {
            delete storedRefs.current[id];
        }
    }

    return (
            <div ref={boundRef} className="relative flex grow flex-col gap-2 border-0 scrollbar fade-in">
                
                {songs && songs.length > 0 ? songs.map((song, index) => (
                    <div key={song.id} id="ref" ref={(node) => {
                        handleRef(song.id, node);
                    }} className={`
                        p-4 bg-gray-500/30 rounded-lg 
                        hover:bg-gray-600 hover:cursor-pointer relative
                        flex justify-between cursor-grab active:cursor-grabbing select-none
                        ${stateCtx && stateCtx.currentSong && stateCtx.currentSong.id === song.id ? "text-emerald-500" : ""}
                        ${dragging && dragging !== song.id ? "opacity-50" : ""}
                    `} 
                    aria-disabled={dragging !== null && dragging !== song.id}
                    onMouseOver={(e => {
                        if (draggingRef.current !== null) {
                            
                            e.stopPropagation();
                            e.preventDefault();
                            return;
                        }
                    })}
                    
                    onPointerMoveCapture={(e) => {

                        if (draggingRef.current !== song.id) {
                            return;
                        }

                        const ref = storedRefs.current[song.id];
                        if (!ref) return;
                        ref!.style.position = 'relative';
                        ref!.style.zIndex = '100001';
                        ref.setPointerCapture(e.pointerId);
                        const parentRect = ref!.getBoundingClientRect();
                        const containerRect = boundRef.current!.getBoundingClientRect();
                        const handleRect = ref.children[0].children[0].children[0].getBoundingClientRect();
                        const handleY = handleRect.top - containerRect.top;

                        const y = Math.floor(e.clientY - containerRect.y);
                        console.log(y, ":", handleY, ":", y - handleY)
                        if (parentRect.bottom + y - handleY >= containerRect.bottom) {
                            
                            ref.style.transform = '';
                            return;
                        }
                        
                        ref.style.transform = `translateY(${y - handleY}px)`;

                        const nextSibling = ref.nextElementSibling as HTMLDivElement | null;
                        const previousSibling = ref.previousElementSibling as HTMLDivElement | null;
                        if (previousSibling) {
                            const prevRect = previousSibling.getBoundingClientRect();
                            
                            if (parentRect.top < prevRect.top) {
                                console.log("Moving up");
                                // Move up
                                const temp = songs[index - 1];
                                songs[index - 1] = songs[index];
                                songs[index] = temp;
                                console.log("changing!")
                                setSongs([...songs]);
                            }
                        }
                        if (nextSibling) {
                            const nextRect = nextSibling.getBoundingClientRect();
                            if (parentRect.bottom > nextRect.top + nextRect.height*0.33) {
                                console.log("Moving down");
                                // Move down
                                const temp = songs[index + 1];
                                songs[index + 1] = songs[index];
                                songs[index] = temp;
                                console.log("changing!")
                                setSongs([...songs]);

                            }
                        }
                        
                    }}

                    onMouseEnter={(e) => {
                        e.preventDefault();
                    }}
                    onMouseUp={(e) => {
                            console.log("Mouse up");   
                            
                            if (draggingRef.current === song.id) {
                                e.stopPropagation();
                                console.log("Dropped:", song.title);
                                setTimeout(() => {
                                    draggingRef.current = null;
                                    setDragging(null);
                                }, 100) 
                                
                                const ref = storedRefs.current[song.id];
                                if (ref) {
                                    ref.style.transform = ``;
                                }
                                stateCtx!.queue.set(songs);
                                // Determine new index based on drop position
                            }
                        }}
                    
                
                    onClick={(e) => {
                        if (draggingRef.current !== null) {
                            e.stopPropagation();
                            e.preventDefault();
                            return;
                        }
                        setTimeout(() => {
                            stateCtx!.queue.index.current = index;
                            console.log("Song index set to: ", index);
                            stateCtx!.play(song);
                        },50)
                    }}
                    
                    >
                        <div className={"flex flex-row justify-between items-center w-full relative"}>
                            <div className={
                                    `h-full w-fit flex items-center justify-center 
                                    ${draggingRef.current ? draggingRef.current === song.id ? "text-emerald-500 cursor-grabbing" : "hidden" : ""}
                                `} onPointerMove={(e) => {
                                    if (draggingRef.current !== song.id) {
                                        e.stopPropagation();
                                        return;
                                    }
                                }}
                                onMouseDown={(e) => {
                                        e.stopPropagation();
                                        if (draggingRef.current !== song.id) {
                                            setDragging(song.id);
                                            const ref = storedRefs.current[song.id];
                                            if (!ref) return;
                                            
                                            draggingRef.current = song.id;
                                            console.log("Started dragging:", song.title);
                                        }

                                    }}
                            >
                                <GripHorizontal  />
                                </div>
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
    );
}