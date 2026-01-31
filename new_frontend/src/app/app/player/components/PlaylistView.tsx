import { Playlist, Song } from "@/app/types";
import { Edit, EllipsisIcon, MoveLeft, PlayIcon, PlusIcon, ShuffleIcon, X } from "lucide-react";
import Image from "next/image";
import { useContext, useState, useEffect } from "react";
import { SocketContext } from "@/app/components/SocketContext";
import { StateContext } from "./StateProvider";
import { OverlayContext } from "@/components/OverlayProvider";
import CreatePlaylist from "./CreatePlaylist";
export default function PlaylistView({playlist}: {playlist: Playlist | undefined}) {
    const socketCtx = useContext(SocketContext);
    const stateCtx = useContext(StateContext);
    const overlayCtx = useContext(OverlayContext);
    const [editing, setEditing] = useState<boolean>(false);

    
    const songs: Song[] = playlist?.songs.map((songId) => {
        const song = socketCtx?.data.songs.find((song) => song.id === songId);
        if (song) return song;
    }).filter(s => s !== undefined && s.id !== undefined) as Song[];
    
    useEffect(() => {
        if (editing) {
            overlayCtx.setButtons([
                {
                    icon: <MoveLeft />,
                    tooltip: "Close Editor",
                    action: () => {
                        setEditing(false);
                    }
                }
            ]);
            return;
        }
        overlayCtx.setButtons([
        {
            icon: <PlayIcon></PlayIcon>,
            tooltip: "Play",
            action: () => {
                if (songs.length === 0) return;
                if (!stateCtx) return;
                stateCtx?.queue.set(songs);
                // eslint-disable-next-line react-hooks/immutability
                stateCtx.queue.index.current = 0;
                stateCtx.play(songs[0]);
                overlayCtx.clearOverlay()
            }
        },
        {
            icon: <ShuffleIcon></ShuffleIcon>,
            tooltip: "Shuffle",
            action: () => {
                if (songs.length === 0) return;
                if (stateCtx && socketCtx) {
                    const shuffledSongs = [...songs].sort(() => Math.random() - 0.5);
                    stateCtx?.setCurrentSong(shuffledSongs[0]);
                    stateCtx?.queue.set(shuffledSongs);
                    // eslint-disable-next-line react-hooks/immutability
                    stateCtx.queue.index.current = 0;
                    stateCtx.play(shuffledSongs[0]);
                    overlayCtx.clearOverlay()
                }
                
            }
        },
        {
            icon: <Edit></Edit>,
            tooltip: "Edit Playlist",
            action: () => {
                setEditing(true);
            }   
        }
    ]);

    }, [editing])
    if (!playlist) return <></>;
    
    const playlistView = (
            <div className="flex flex-col gap-4 items-center h-full overflow-y-scroll scrollbar">
                
                {playlist && songs.map((song) => {
                    console.log(song);
                    if (song === undefined) return <></>;
                    return (
                    <div key={song.id} className="p-4 bg-gray-500/30 rounded-lg hover:bg-gray-600 hover:cursor-pointer flex justify-between w-full" onClick={() => {
                        if (stateCtx) {
                            stateCtx.queue.index.current = songs.findIndex(s => s.id === song.id);
                            stateCtx.queue.set(songs);
                            stateCtx.play(song);
                            overlayCtx.clearOverlay() 
                        }
                            
                        }}>
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
                        
                    </div>
                )})}
            </div>
    );
    
    return editing ? <CreatePlaylist editing={{
        playlist: playlist,
    }}/> : playlistView;

}