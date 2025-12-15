import { createContext, Dispatch, RefObject, SetStateAction } from "react";
import type { Socket } from "socket.io-client";
import { Playlist, Song } from "../types";


export interface SocketContextType {
    socket: RefObject<Socket | null>;
    data: {songs: Song[], playlists: Playlist[], name: RefObject<string>};
    connect: (url: string, token: string) => void;
    disconnect: () => void;
}
export const SocketContext = createContext<SocketContextType | null>(null);