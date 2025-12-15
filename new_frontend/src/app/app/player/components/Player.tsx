import { SocketContext } from "@/app/components/SocketContext";
import { useContext, useEffect, useRef } from "react";
import Image from "next/image";
import { Song } from "@/app/types";
import { AudioPlayerButton, AudioPlayerDuration, AudioPlayerProgress, AudioPlayerProvider, AudioPlayerTime } from "@/components/ui/audio-player";
export default function Player({currentSong}: {currentSong: Song}) {
    const socketCtx = useContext(SocketContext);
    const socket = socketCtx?.socket.current;
    const audioRef = useRef<HTMLAudioElement>(null);
    const sourceRef = useRef<MediaSource | null>(null);
    const sourceBufferRef = useRef<SourceBuffer | null>(null);
    const queueRef = useRef<{buffer: ArrayBuffer, chunk_counter: number}[]>([]);
    const chunkCounterRef = useRef<number>(0);

    const appendChunk = (chunk: {buffer: ArrayBuffer, chunk_counter: number}) => {
        if (queueRef.current.at(-1) && chunk.chunk_counter > queueRef.current!.at(-1)!.chunk_counter) {
            queueRef.current.push(chunk);
            return;
        }
        sourceBufferRef.current?.appendBuffer(chunk.buffer);
        const chunkCounter = chunkCounterRef.current;
        if (chunk.chunk_counter + 1 === chunkCounter) {
            const source = sourceRef.current!
            const buffer = sourceBufferRef.current!;
            console.log("Ending stream");
            buffer!.addEventListener('updateend', () => {
                try {
                    source!.endOfStream();
                } catch (error) {
                    console.error("Error ending stream: ", error);  
                }
            });
        }
    }
    useEffect(() => {
        if (!currentSong) return;
        socket?.on("song data start", (song, total_chunks) => {
            console.log("Receiving song data for: ", song.metadata.common.title);
            chunkCounterRef.current = total_chunks;
            const mediaSource = new MediaSource();
            sourceRef.current = mediaSource;
            if (audioRef.current) {
                audioRef.current.src = URL.createObjectURL(mediaSource);
            }
            mediaSource.addEventListener('sourceopen', () => {
                console.log("Media source opened");
                
                mediaSource.duration = song.metadata.format.duration || 0;
                const buffer = mediaSource.addSourceBuffer('audio/mpeg');
                sourceBufferRef.current = buffer;
                audioRef.current?.play();
                buffer.onupdateend = () => {
                    if (queueRef.current.length > 0 && sourceBufferRef.current && !sourceBufferRef.current.updating) {
                        const chunk = queueRef.current.shift()!;
                        console.log("Appending queued chunk #", chunk.chunk_counter);
                        appendChunk(chunk);
                    }
                }
                
                socket?.emit('song data ready', currentSong)
            });
            
            
        });

        socket?.on(`song data ${currentSong.id}`, (chunk: {buffer: ArrayBuffer, chunk_counter: number}) => {
            console.log("Received song data chunk # ", chunk.chunk_counter);
            if (sourceBufferRef.current && !sourceBufferRef.current.updating) {
                appendChunk(chunk);
            } else if (sourceBufferRef.current) {
                console.log("Buffer busy, queuing chunk # ", chunk.chunk_counter);
                queueRef.current.push(chunk);
            }
        });

       
        return () => {
            socket?.removeAllListeners(`song data ${currentSong.id}`);
            socket?.removeAllListeners("song data start");
            if (sourceRef.current) {
                sourceRef.current = null;
                sourceBufferRef.current = null;
            }
        }
       },[currentSong, socket]);

    if (socketCtx && currentSong) return (
        <div className="flex md:flex-col shrink gap-2 w-full py-2">
            {window.innerWidth > 768 ? (
                <p className="md:self-center">Now Playing</p>
            ): undefined}
            <Image
                src={currentSong.metadata.common.picture ?`data:${currentSong.metadata.common.picture![0].format};base64,${Buffer.from(currentSong.metadata.common.picture![0].data).toString('base64')}` : ""}
                alt="Album Art"
                width={window.innerWidth < 768 ? 50 : 400}
                height={window.innerWidth < 768 ? 50 : 400}
                className="md:self-center rounded-lg transition duration-150 hover:scale-105"
            />
            <div className="md:items-center text-center">
                {window.innerWidth > 768 ? (
                    <>
                        <h1 className={`${window.innerWidth < 768 ? "line-clamp-1 overflow-clip max-h-auto" : ""}`}>{currentSong.metadata.common.title}</h1>
                        <h2>{currentSong.metadata.common.artist}</h2>
                    </>
                ): (
                    <>
                        <p><strong>{currentSong.metadata.common.title}</strong></p>
                        <p>{currentSong.metadata.common.artist}</p>
                    </>
                )}
            </div>
            
            <AudioPlayerProvider audioRef={audioRef}>
                <div className="flex flex-row flex-1 items-center justify-center gap-4 bg-[lab(7.78201% -.0000149012 0)] bg-black rounded-lg p-2 h-10 max-w-full">
                    <AudioPlayerButton className="border-0"></AudioPlayerButton>
                    <AudioPlayerTime></AudioPlayerTime>
                    <AudioPlayerProgress className="flex-1 color-white rounded-lg"></AudioPlayerProgress>
                    <AudioPlayerDuration></AudioPlayerDuration>
                </div>
                
            </AudioPlayerProvider>
        </div>
    )
}