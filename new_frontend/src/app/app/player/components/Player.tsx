/* eslint-disable react-hooks/exhaustive-deps */
import { SocketContext } from "@/app/components/SocketContext";
import { useContext, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Song } from "@/app/types";
import { AudioPlayerButton, AudioPlayerDuration, AudioPlayerProgress, AudioPlayerProvider, AudioPlayerTime } from "@/components/ui/audio-player";
import { Ellipsis, SkipBack, SkipForward, ListMusic, Share2Icon } from "lucide-react";
import { ErrorContext } from "@/app/components/ErrorContext";
import { StateContext } from "./StateProvider";
import { AudioPlayerSpeed } from "@/components/ui/audio-player";
import { DropdownMenu, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DropdownMenuContent } from "@radix-ui/react-dropdown-menu";
import QueueView from "./QueueView";
import ShareView from "./ShareView";

export default function Player() {
    const socketCtx = useContext(SocketContext);
    const errorCtx = useContext(ErrorContext);
    const stateCtx = useContext(StateContext);

    const [queueOverlay, setQueueOverlay] = useState<boolean>(false);
    const [shareOverlay, setShareOverlay] = useState<boolean>(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, setForceUpdate] = useState<number>(0);
    const socket = socketCtx?.socket.current;
    const audioRef = useRef<HTMLAudioElement>(null);
    const sourceRef = useRef<MediaSource | null>(null);
    const sourceBufferRef = useRef<SourceBuffer | null>(null);
    const queueRef = useRef<{buffer: ArrayBuffer, chunk_counter: number}[]>([]);
    const chunkCounterRef = useRef<number>(0);
    const iosModeRef = useRef<boolean>(false);

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
                    if (stateCtx) stateCtx.player.setLoading(false);
                } catch (error) {
                    console.error("Error ending stream: ", error);  
                }
            });
        }
    }

    useEffect(() => {
        if (!audioRef.current) return;
        if (!stateCtx) return;
        if (stateCtx.persistedState.current && stateCtx.currentSong) {
            console.log("Restoring persistent playback..");
            stateCtx.play(stateCtx.currentSong);
        }
    }, []);

    useEffect(() => {
        if (!audioRef.current) return;
        let retryIndicator = false;
        const errorListener = () => {
            errorCtx?.setError("Audio playback error occurred.");
            if (retryIndicator) return;
            retryIndicator = true;
            stateCtx?.play(stateCtx.currentSong!);
        };
        const updateTimeListener = () => {
            navigator.mediaSession.setPositionState({
                duration: audioRef.current?.duration || 0,
                playbackRate: audioRef.current?.playbackRate || 1,
                position: audioRef.current?.currentTime || 0
            });
            if (stateCtx) {
                stateCtx.player.currentTime.current = audioRef.current?.currentTime || 0;
                stateCtx.player.duration.current = audioRef.current?.duration || 0;
            }
        };
        const playingListener = () => {
            if (stateCtx) {
                stateCtx.player.isPlaying.current = true;
            }
        };
        const stoppedListener = () => {
            if (stateCtx) {
                stateCtx.player.isPlaying.current = false;
            }
        };
        
        audioRef.current?.addEventListener('playing', playingListener);
        audioRef.current?.addEventListener('pause', stoppedListener);
        audioRef.current?.addEventListener('ended', stoppedListener);
        audioRef.current?.addEventListener('timeupdate', updateTimeListener);
        audioRef.current?.addEventListener('error', errorListener);

        return () => {
            audioRef.current?.removeEventListener('error', errorListener);
            audioRef.current?.removeEventListener('timeupdate', updateTimeListener);
            audioRef.current?.removeEventListener('playing', playingListener);
            audioRef.current?.removeEventListener('pause', stoppedListener);
            audioRef.current?.removeEventListener('ended', stoppedListener);
        }
    });
    
    const listen = () => {
        if (!stateCtx) return;
        console.log("Song ended, advancing to next song in queue");
        if (stateCtx) stateCtx.queue.nextSong();
    }

    useEffect(() => {
        setForceUpdate(prev => prev + 1);
    },[stateCtx?.queue.index, stateCtx?.queue.songs])

    useEffect(() => {
        const currentSong = stateCtx?.currentSong;
        console.log("Setting up song data listeners for: ", currentSong ? currentSong.title : "no song");
        if (!currentSong) return;
        
        socket?.once("song data start", (song: Song, total_chunks) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const isIphone = /iPhone/.test(navigator.userAgent) && !(window as any).MSStream;
            iosModeRef.current = isIphone;
            console.log("iOS device?", isIphone);
            if (stateCtx && stateCtx.currentSong?.id !== song.id) {
                console.log("Received song data start for a different song, ignoring");
                return;
            }
            console.log("Setting loading state for song: ", song.title);
            stateCtx.player.setLoading(true);
            audioRef.current?.removeEventListener("ended", listen);
            console.log(song.mime)
            if (song.mime.includes("m4a") || isIphone) {
                console.log("m4a file detected or iOS mode, switching to iOS mode");
                iosModeRef.current = true;
                socket?.emit('song data ready', currentSong, true)
                audioRef.current?.addEventListener("ended", listen);
                return;
            }
            console.log("Preparing MediaSource for song playback");
            chunkCounterRef.current = total_chunks;
            const mediaSource = new MediaSource();
            sourceRef.current = mediaSource;
            if (audioRef.current) {
                audioRef.current.src = URL.createObjectURL(mediaSource);
            }
            navigator.mediaSession.metadata = new MediaMetadata({
                title: currentSong.title,
                artist: currentSong.artists.join(", "),
                album: currentSong.album,
                artwork: currentSong.coverImage ? [{
                    src: `${socketCtx?.url.current}/photo/${currentSong.id}?socketId=${socketCtx?.socket.current!.id}`,
                    sizes: '512x512',
                    type: 'image/jpeg',
                }] : []
            });
            navigator.mediaSession.setActionHandler('nexttrack', stateCtx?.queue.nextSong || null);
            navigator.mediaSession.setActionHandler('previoustrack', stateCtx?.queue.prevSong || null);
            mediaSource.addEventListener('sourceopen', async () => {
                console.log("Media source opened");
                
                mediaSource.duration = song.duration || 0;
                const buffer = mediaSource.addSourceBuffer(song.mime);
                sourceBufferRef.current = buffer;
                audioRef.current?.play();
                buffer.onupdateend = () => {
                    if (queueRef.current.length > 0 && sourceBufferRef.current && !sourceBufferRef.current.updating) {
                        const chunk = queueRef.current.shift()!;
                        appendChunk(chunk);
                    }
                }
                
                socket?.emit('song data ready', currentSong)
                if (stateCtx.persistedState.current) {
                    console.log("Restoring persistent position..");
                    
                    console.log(JSON.stringify(stateCtx.player));
                    audioRef.current!.currentTime = stateCtx.player.currentTime.current;
                    stateCtx.persistedState.current = false;
                }
                
                
                audioRef.current?.addEventListener("ended", listen);
            });

            return () => {
                audioRef.current?.removeEventListener("ended", listen);
                socket.removeAllListeners("song data start");
            }
            
            
        });

        socket?.on(`song data ${currentSong.id}`, (chunk: {buffer: ArrayBuffer, chunk_counter: number}) => {
            navigator.mediaSession.setPositionState({
                duration: audioRef.current?.duration || 0,
                playbackRate: audioRef.current?.playbackRate || 1,
                position: audioRef.current?.currentTime || 0
            });
            if (iosModeRef.current) {
                const blob = new Blob([chunk.buffer], {type: 'audio/m4a'});
                const url = URL.createObjectURL(blob);
                if (audioRef.current) {
                    audioRef.current.src = url;
                    audioRef.current.play();
                }
                return;
            }
            
            
            if (sourceBufferRef.current && !sourceBufferRef.current.updating) {
                appendChunk(chunk);
            } else if (sourceBufferRef.current) {
                queueRef.current.push(chunk);
            }
        });

       
        return () => {
            socket?.removeAllListeners(`song data ${currentSong.id}`);
            if (sourceRef.current) {
                sourceRef.current = null;
                sourceBufferRef.current = null;
            }
        }
       },[audioRef.current, stateCtx?.currentSong]);

       useEffect(() => {
        

       }, [stateCtx?.currentSong, stateCtx?.queue.songs]);
        const currentSong = stateCtx?.currentSong;
        if (socketCtx && currentSong) return (
            <div className="flex flex-col shrink gap-2 w-full py-2">
                { queueOverlay && (
                    <QueueView setOpen={setQueueOverlay} />
                )}
                { shareOverlay && (
                    <ShareView exit={() => {setShareOverlay(false)}} song={currentSong}/>
                )}
                {window.innerWidth > 768 ? (
                    <p className="md:self-center">Now Playing</p>
                ): undefined}
                { window.innerWidth > 768 ? (
                    <Image
                    src={currentSong.coverImage ? `${socketCtx?.url.current}/photo/${currentSong.id}?socketId=${socketCtx?.socket.current!.id}` : "/placeholder.jpg"}
                    alt="Album Art"
                    width={window.innerWidth < 768 ? 50 : 400}
                    height={window.innerWidth < 768 ? 50 : 400}
                    className="md:self-center rounded-lg transition duration-150 hover:scale-105"
                    unoptimized
                /> ) : null}
                <div className="lg:items-center text-center">
                    {window.innerWidth > 768 ? (
                        <>

                            <h1 className={`${window.innerWidth < 768 ? "line-clamp-1 overflow-clip max-h-auto" : ""}`}>{currentSong.title}</h1>
                            <h2>{currentSong.artists.join(", ")}</h2>
                        </>
                    ): (
                        <div className="flex flex-row items-center gap-4">
                            <Image
                                src={currentSong.coverImage ? `${socketCtx?.url.current}/photo/${currentSong.id}?socketId=${socketCtx?.socket.current!.id}` : "/placeholder.jpg"}
                                alt="Album Art"
                                width={window.innerWidth < 768 ? 50 : 400}
                                height={window.innerWidth < 768 ? 50 : 400}
                                className="md:self-center rounded-lg transition duration-150 hover:scale-105"
                                unoptimized
                            />
                            <div className="flex flex-col items-start">
                                <p><strong>{currentSong.title}</strong></p>
                                <p>{currentSong.artists.join(", ")}</p>
                            </div>
                        </div>
                    )}
                </div>
                
                <AudioPlayerProvider audioRef={audioRef}>
                    <div className="flex flex-row flex-1 items-center justify-center gap-4 bg-[lab(7.78201% -.0000149012 0)] bg-black rounded-lg p-2 h-10 max-w-full">
                        {stateCtx && stateCtx.currentSong && stateCtx.queue.index.current && stateCtx.queue.index.current > 0 ? (
                            <button className="border-0 p-2 hover:bg-white/10 rounded-lg" onClick={() => {
                                stateCtx.queue.prevSong();
                            }}>
                                <SkipBack />
                            </button>
                            
                        ) : null}
                        <AudioPlayerButton onClick={()=> {
                            if (audioRef.current && isNaN(audioRef.current?.duration)) {
                                console.log("Audio duration is NaN, restarting current song");
                                const currentSong = stateCtx?.currentSong;
                                stateCtx.setCurrentSong(undefined);
                                console.log("Cleared current song");
                                stateCtx?.play(currentSong!);
                            }
                        }} className="border-0"></AudioPlayerButton>
                        {stateCtx && stateCtx.currentSong && stateCtx.queue.index.current !== null && stateCtx.queue.index.current < stateCtx.queue.songs.length - 1 ? (
                            <button className="border-0 p-2 hover:bg-white/10 rounded-lg" onClick={() => {
                                stateCtx.queue.nextSong();
                            }}>
                                <SkipForward />
                            </button>
                            
                        ) : null}
                        <AudioPlayerTime></AudioPlayerTime>
                        <AudioPlayerProgress className="flex-1 color-white rounded-lg"></AudioPlayerProgress>
                        <AudioPlayerDuration></AudioPlayerDuration>
                        
                        {window.innerWidth >= 768 ? ( 
                            <>
                                <AudioPlayerSpeed className="border-0" />
                                <button className="border-0 p-1 m-0" onClick={() => {
                                    setShareOverlay(true);
                                }}><Share2Icon /></button>
                                { stateCtx.queue.songs.length > 0 && <ListMusic className="border-0 hover:bg-white hover:text-black hover:cursor-pointer" onClick={() => {setQueueOverlay(!queueOverlay)}} /> }
                            </> 
                        ) : (
                            <DropdownMenu onClick={(e) => e.stopPropagation()}>
                                <DropdownMenuTrigger className="border-0">
                                    <Ellipsis />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent side="top" className="bg-gray-800 flex flex-row rounded-lg w-fit text-white">
                                    <DropdownMenuItem className="max-w-1/2 hover:bg-transparent">
                                        <AudioPlayerSpeed onClick={(e) => {e.stopPropagation()}} style={{color: 'white'}} className="border-0" />
                                    </DropdownMenuItem>
                                     { stateCtx.queue.songs.length > 0 && <DropdownMenuItem onClick={() => {
                                            setQueueOverlay(true)
                                            }}>
                                       <ListMusic className="border-0 text-white"  /> 
                                    </DropdownMenuItem> }
                                    <DropdownMenuItem asChild>
                                        <button className="border-0 p-1 m-0 hover:text-black" onClick={() => {
                                            setShareOverlay(true);
                                        }}><Share2Icon className="text-white hover:text-black" /></button>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                    
                </AudioPlayerProvider>
            </div>
        )
}