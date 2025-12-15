import { SocketContext } from "@/app/components/SocketContext";
import { useContext } from "react";
import Image from "next/image";
export default function Playlists() {
    const socketCtx = useContext(SocketContext);
    return socketCtx?.data.playlists.map((playlist, index) =>  {
        return (
            <div key={index} className="p-4 bg-gray-500/30 rounded-lg hover:bg-gray-600 hover:cursor-pointer flex justify-between" onClick={() => {
                
            }}>
                <div className="flex flex-row text-center items-center">
                    {playlist && playlist.album_cover && playlist.album_cover.data.length > 0 ? (
                    <Image
                            src={`data:${playlist.album_cover.format};base64,${Buffer.from(playlist.album_cover.data).toString('base64')}`}
                            alt="Album Art"
                            width={50}
                            height={50}
                            className="inline-block mr-4"
                        />
                    ) : null}
                    <p><strong>{playlist.name}</strong></p>
                </div>
                
            </div>
        )
    });
    
}