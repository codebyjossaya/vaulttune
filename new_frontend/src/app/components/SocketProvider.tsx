'use client';
import { useRef, useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { SocketContext } from "./SocketContext";
import { Playlist, Song } from "../types";

export default function SocketProvider({ children }: { children: React.ReactNode }) {
    const socketRef = useRef<Socket>(null);
    const nameRef = useRef<string>("");
    const [songs, setSongs] = useState<Song[]>([]);
    const [playlists, setPlaylists] = useState<[]>([]);
    const [owner, setOwner] = useState<boolean>(false);
    const urlRef = useRef<string>("");
    const totalSongsRef = useRef<number>(0);
    const connect = (url: string, token: string) => {
        if (!socketRef.current) {
            urlRef.current = url;
            socketRef.current = io(url, {
                auth: {
                    token: token
                },
                
            });
            
            socketRef.current.on("connect", () => {
                console.log("Socket connected:", socketRef.current?.id);
            });
            socketRef.current.on("songs", (data: [], total: number) => {
                console.log("Received songs data:", data);
                setSongs(prev => {
                    const songIds = new Set(prev.map(song => song.id));
                    const newSongs = data.filter((song: Song) => !songIds.has(song.id));
                    return [...prev, ...newSongs];
                });
                totalSongsRef.current = total;
            });
            socketRef.current.on("playlists", (data: []) => {
                setPlaylists(data);
            });
            socketRef.current.on("owner", () => {
                setOwner(true);
                console.log("User is vault owner");
            })
            socketRef.current.on("play song", (song: Song) => {
                console.log("Received play song command for song: ", song.title);
            });
        }
    };
    const disconnect = () => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
            console.log("Socket disconnected");
        }
    }

    useEffect(() => {
  console.log("SocketProvider mounted");

  return () => {
    console.log("SocketProvider unmounted");
  };
}, []);

    return (
        <SocketContext.Provider value={{
            socket: socketRef,
            data: {owner, songs, totalSongs: totalSongsRef, setSongs, playlists, name: nameRef},
            connect,
            disconnect,
            url: urlRef,
        }}>
            {children}
        </SocketContext.Provider>
    )



}