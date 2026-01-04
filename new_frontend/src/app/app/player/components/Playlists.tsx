import { SocketContext } from "@/app/components/SocketContext";
import { useContext, useState } from "react";
import Image from "next/image";
import PlaylistView from "./PlaylistView";
import { Playlist } from "@/app/types";
export default function Playlists() {
    const socketCtx = useContext(SocketContext);
    const [playlist, setPlaylist] = useState<Playlist | undefined>(undefined);
    return socketCtx?.data.playlists.map((data, index) =>  {
        return (
            <div key={index} className="p-4 bg-gray-500/30 rounded-lg hover:bg-gray-600 hover:cursor-pointer flex justify-between" onClick={() => {
                
            }}>
                <div className={`${playlist !== undefined ? "absolute flex h-screen w-screen top-0 left-0" : "hidden"}`}>
                    <PlaylistView setOpen={() => {
        
                        setPlaylist(undefined)}
                        } playlist={playlist} />
                </div>

                <div className="flex flex-row text-center items-center h-full w-full" onClick={() => {
                    console.log('click')
                    setPlaylist(data);
                    console.log(data);
                    
                }}>
                    <Image
                            src={data.album_cover || "/placeholder.jpg"}
                            alt="Album Art"
                            width={50}
                            height={50}
                            className="inline-block mr-4 rounded-md"
                            
                        />
                    <p><strong>{data.name}</strong></p>
                </div>
                
            </div>
        )
    });
    
}