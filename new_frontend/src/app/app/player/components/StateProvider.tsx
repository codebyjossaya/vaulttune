'use client';
import { SocketContext } from "@/app/components/SocketContext";
import { Song } from "@/app/types";
import { createContext, RefObject, useContext, useEffect, useRef, useState } from "react";

export const StateContext = createContext<{
    vault_id?: RefObject<string | undefined>,
    persistedState: RefObject<boolean>,
    queue: {
        songs: Song[],
        index: RefObject<number | null>,
        prevSong: () => void,
        nextSong: () => void,
        set: (songs: Song[]) => void,
    }
    currentSong: Song | undefined | null,
    setCurrentSong: (song: Song | undefined | null) => void,
    play: (song: Song) => void,
    player: {
        isPlaying: RefObject<boolean>,
        currentTime: RefObject<number>,
        duration: RefObject<number>,
        setLoading: (loading: boolean) => void,
    }
} | undefined>(undefined)

export function StateProvider({children}: {children: React.ReactNode}) {
    const [songs, setSongs] = useState<Song[]>([]);
    const [currentSong, setCS] = useState<Song | undefined | null>(null);
    const [loading, setL] = useState<boolean>(false);
    const persistedStateRef = useRef<boolean>(false);
    const currentSongRef = useRef<Song | undefined | null>(null);
    const setCurrentSong = (song: Song | undefined | null) => {
        console.log("Setting current song to: ", song?.title);
        setCS(song);
        currentSongRef.current = song;
    }
    const pendingSongRef = useRef<Song | undefined>(undefined);
    const setPendingSong = (pendingSong: Song | undefined) => {
        pendingSongRef.current = pendingSong;
    }
    const indexRef = useRef<number | null>(null);
    const isPlayingRef = useRef<boolean>(false);
    const currentTimeRef = useRef<number>(0);
    const durationRef = useRef<number>(0);
    const vault_idRef = useRef<string | undefined>(undefined);
    const loadingRef = useRef<boolean>(false);

    const socketCtx = useContext(SocketContext)

    const setLoading = (loading: boolean) => {
        loadingRef.current = loading;
        setL(loading);
    }
    useEffect(() => {
        console.log("state provider listener mounted")
        socketCtx?.socket.current?.once("songs", () => {
            console.log("Socket connected - checking for persisted state");
            const savedState = localStorage.getItem(vault_idRef.current ?? "playerState");
            console.log("Saved state: ", savedState);
            if (savedState) {
                const state = JSON.parse(savedState);
                if (state.isPlaying === false && state.duration === 0) return;
                persistedStateRef.current = true;
                if (state.songs) {
                    console.log("Restoring persisted queue with ", state.songs.length, " songs");
                    setSongs(state.songs);
                }
                if (state.index !== undefined) {
                    console.log("Restoring persisted queue index: ", state.index);
                    indexRef.current = state.index;
                }
                if (state.isPlaying !== undefined) {
                    console.log("Restoring persisted isPlaying state: ", state.isPlaying);
                    isPlayingRef.current = state.isPlaying;
                }
                if (state.currentTime !== undefined) {
                    console.log("Restoring persisted currentTime: ", state.currentTime);
                    currentTimeRef.current = state.currentTime;
                }
                if (state.duration !== undefined) {
                    console.log("Restoring persisted duration: ", state.duration);
                    durationRef.current = state.duration;
                }
                if (state.currentSong) {
                    console.log("Restoring persisted current song: ", state.currentSong.title);
                    setCurrentSong(state.currentSong);                    
                } 
            }
        });
   
    }, [socketCtx?.socket.current]);
    useEffect(() => {
        if (!currentSong) return;
        let timeoutId: string | number | NodeJS.Timeout | undefined = undefined;
        const saveState = () => {
            const state = {
                currentSong,
                songs, // queue
                index: indexRef.current,
                isPlaying: isPlayingRef.current,
                currentTime: currentTimeRef.current,
                duration: durationRef.current,
            };
            console.log("Persisting player state: ", state);
            timeoutId = setTimeout(() => {
                if (!persistedStateRef.current)
                localStorage.setItem(vault_idRef.current ?? "playerState", JSON.stringify(state));
                saveState();
            }, 5000);
        }    
        saveState();

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        }
    }, [currentSong, songs]);
    
    const play = async (song: Song) => {
        if (currentSong && currentSong.id === song.id && persistedStateRef.current === false) {
            console.log("Song is already playing:", song.title);
            return;
        }
        if (song.id === pendingSongRef.current?.id) {
            console.log("Song is already pending:", song.title);
            return;
        }
        if (loadingRef.current) {
            console.log("Stopping song", currentSong?.title);
            socketCtx?.socket.current?.emit("stop song", currentSong);
        };
        setPendingSong(song);
        if (pendingSongRef.current === undefined) return;
        if (loadingRef.current) {
            await new Promise((resolve, reject) => {
                socketCtx?.socket.current?.once("song data end", (id) => {
                    if (id === currentSong?.id) {
                        console.log("Previous song stopped, now playing: ", pendingSongRef.current?.title);
                        resolve(null);
                    } else reject(`Stopped song ID ${id} does not match current song ID ${currentSongRef.current?.id}`);
                });
            })
            
        }
        console.log("Playing song: ", pendingSongRef.current.title);
        if (!persistedStateRef.current) {
            console.log("Clearing current song to force re-play");
            setCurrentSong(undefined);
        }
        console.log("see u in 100ms")
        setTimeout(() => {
            console.log(pendingSongRef.current);
            setCurrentSong(pendingSongRef.current);
            setPendingSong(undefined);
            if (!currentSongRef.current) return;
            console.log("Emitting play song for: ", currentSongRef.current.title);
            if (socketCtx && socketCtx.socket.current)
            socketCtx.socket.current.emit("play song", currentSongRef.current);
        }, 100);
    }

    return (
        <StateContext.Provider value={{
            vault_id: vault_idRef,
            persistedState: persistedStateRef,
            queue: {
                songs,
                index: indexRef,
                prevSong: () => {
                    if (!songs) return;
                    if (indexRef.current === null) return;
                    const queuePos = indexRef;
                    if (!queuePos || !queuePos.current) return;
                    const prevIndex = queuePos.current - 1;
                    if (prevIndex < 0) {
                        console.log("Start of playlist reached");
                        return;
                    }
                    queuePos.current = prevIndex;
                    const prevSong = songs[prevIndex];
                    console.log("Reverting to previous song in playlist: ", prevSong.title);
                    play(prevSong);
                } ,
                nextSong: () => {
                    if (!songs) return;
                    if (indexRef.current === null) return;
                    console.log("Current queue position: ", indexRef.current);
                    const nextIndex = indexRef.current + 1;
                    console.log("Next queue position: ", nextIndex);
                  
                    if (nextIndex >= songs.length) {
                        console.log("End of playlist reached");
                        return;
                    }
                    console.log("Advancing to next song in playlist: ", songs[nextIndex].title);
                    indexRef.current = nextIndex;
                    const nextSong =  songs[nextIndex]
                    play(nextSong);
                },
                set: setSongs,
            },
            currentSong,
            setCurrentSong,
            play,
            player: {
                isPlaying: isPlayingRef,
                currentTime: currentTimeRef,
                duration: durationRef,
                setLoading,
            }

        }}>
            {children}
        </StateContext.Provider>
    )
}