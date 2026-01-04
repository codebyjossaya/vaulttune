/* eslint-disable react-hooks/exhaustive-deps */
'use client';
import { Song } from "@/app/types";
import { AudioPlayerButton, AudioPlayerDuration, AudioPlayerProgress, AudioPlayerProvider, AudioPlayerTime } from "@/components/ui/audio-player";
import { Spinner } from "@/components/ui/spinner";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Player({song, share}: {song: Song, share: any}) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [ buffer, setBuffer ] = useState<Blob | null>(null);
    useEffect(() => {
        fetch(`${share.vaultURL}/share/${share.share_id}/buffer`, {
        headers: {
            'Content-Type': 'application/json'
        }
    }).then((res) => res.blob()).then((blob) => {
        setBuffer(blob);
    }).catch((error) => {
        console.error("Error fetching song buffer:", error);
    });
    }, [])
    
    if (!buffer) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <Spinner className="w-10 h-10 text-white" />
                <p className="text-white mt-4">Loading song...</p>
            </div>
        )
    }
    return (
        <div className="flex flex-col items-center justify-center max-w-full ">
            <Image
                src={song.coverImage ? `data:image/png;base64,${song.coverImage}` : '/placeholder.jpg'}
                alt="Song Cover"
                width={300}
                height={300}
                className="mb-4 rounded-md"
            />
            <h2 className="text-white text-2xl2">{song.title}</h2>
            <p className="text-white text-lg mb-4">{song.artists.join(", ")}</p>
            <AudioPlayerProvider audioRef={audioRef}>
                <div className="flex flex-row flex-1 items-center max-w-[90vw] justify-center gap-4 bg-[lab(7.78201% -.0000149012 0)] bg-black rounded-lg p-2 max-h-10 w-lg">
                    
                    <AudioPlayerButton item={{
                        id: song.id,
                        src: URL.createObjectURL(new Blob([buffer], {type: song.mime}))}
                    } />
                    <AudioPlayerTime />
                    <AudioPlayerProgress className="flex flex-1 color-white rounded-lg w-full" />
                    <AudioPlayerDuration />
                </div>
            </AudioPlayerProvider>
            </div>
    )
}