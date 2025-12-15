'use client';
import { useRef, useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { SocketContext } from "./SocketContext";

export default function SocketProvider({ children }: { children: React.ReactNode }) {
    const socketRef = useRef<Socket>(null);
    const nameRef = useRef<string>("");
    const [songs, setSongs] = useState<[]>([]);
    const [playlists, setPlaylists] = useState<[]>([]);
    const connect = (url: string, token: string) => {
        if (!socketRef.current) {
            socketRef.current = io(url, {
                auth: {
                    token: token
                }
            });
            
            socketRef.current.on("connect", () => {
                console.log("Socket connected:", socketRef.current?.id);
            });
            socketRef.current.on("songs", (data: []) => {
                setSongs(data);
            });
            socketRef.current.on("playlists", (data: []) => {
                setPlaylists(data);
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
            data: {songs, playlists, name: nameRef},
            connect,
            disconnect,
        }}>
            {children}
        </SocketContext.Provider>
    )



}