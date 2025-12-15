import { useContext } from "react";
import { SocketContext } from "@/app/components/SocketContext";
import Image from "next/image";
import { Song } from "@/app/types";
export default function Songs({searchTerm, setCurrentSong}: {searchTerm: string, setCurrentSong: (song: Song | null) => void}) {
    const socketCtx = useContext(SocketContext);
    return socketCtx!.data.songs.map((song, index) =>  {
        if (searchTerm && !song.metadata.common.title!.toLowerCase().includes(searchTerm.toLowerCase()) && !song.metadata.common.artist!.toLowerCase().includes(searchTerm.toLowerCase())) {
            return null;
        }
        return (
            <div key={index} className="p-4 bg-gray-500/30 rounded-lg hover:bg-gray-600 hover:cursor-pointer flex justify-between" onClick={() => {
                setCurrentSong(null);
                
                setTimeout(() => {
                    setCurrentSong(song);
                    socketCtx!.socket.current?.emit("play song", song);
                },100)
                
                
            }}>
                <div className="flex flex-row text-center items-center gap-2">
                {song.metadata.common.picture && song.metadata.common.picture.length > 0 ? (
                <Image
                        src={`data:${song.metadata.common.picture[0].format};base64,${Buffer.from(song.metadata.common.picture[0].data).toString('base64')}`}
                        alt="Album Art"
                        width={50}
                        height={50}
                        className="inline-block mr-4"
                    />
                ) : null}
                <p><strong>{song.metadata.common.title}</strong></p>
                <p>{song.metadata.common.artist}</p>
                </div>
                
            </div>
        )})
}