import { Playlist, Song } from "@/app/types";
import { EllipsisIcon, PlayIcon, PlusIcon, ShuffleIcon, X } from "lucide-react";
import Image from "next/image";
import { useContext } from "react";
import { SocketContext } from "@/app/components/SocketContext";
import { StateContext } from "./StateProvider";
import DisplayMode from "@/app/components/DisplayMode";
import { Tooltip, TooltipContent } from "@/components/ui/tooltip";
import { TooltipTrigger } from "@radix-ui/react-tooltip";
export default function PlaylistView({setOpen, playlist}: {setOpen: () => void, playlist: Playlist | undefined}) {
    const socketCtx = useContext(SocketContext);
    const stateCtx = useContext(StateContext);

    if (!playlist) return <></>;
    const songs: Song[] = playlist.songs.map((songId) => {
        const song = socketCtx?.data.songs.find((song) => song.id === songId);
        if (song) return song;
    }) as Song[];
    const playlistButtons = [
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
                setOpen();
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
                    setOpen();
                }
                
            }
        },
        {
            icon: <PlusIcon></PlusIcon>,
            tooltip: "Add to Playlist",
            action: () => {
                if (songs.length === 0) return;
                if (!stateCtx) return;
                const newQueue = stateCtx.queue.songs ? [...stateCtx.queue.songs, ...songs] : songs;
                stateCtx.queue.set(newQueue);
                setOpen();
            }   
        }
    ]
    return (
        <DisplayMode title={playlist.name} setOpen={setOpen} buttons={playlistButtons}>
                <div className="flex flex-col gap-4 items-center h-full overflow-y-scroll scrollbar">

                    {playlist && songs.map((song) => (
                        <div key={song.id} className="p-4 bg-gray-500/30 rounded-lg hover:bg-gray-600 hover:cursor-pointer flex justify-between w-full" onClick={() => {
                            if (stateCtx) {
                                stateCtx.setCurrentSong(song);
                                stateCtx.queue.index.current = songs.findIndex(s => s.id === song.id);
                                stateCtx.queue.set(songs);
                                stateCtx.play(song);
                                setOpen(); 
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
                    ))}
                </div>
        </DisplayMode>
    );

}