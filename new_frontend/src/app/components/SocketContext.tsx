import { createContext, Dispatch, RefObject, SetStateAction } from "react";
import type { Socket } from "socket.io-client";
import { Playlist, Song } from "../types";


export interface SocketContextType {
    socket: RefObject<Socket | null>;
    data: {owner: boolean,songs: Song[], totalSongs: RefObject<number>, setSongs: Dispatch<SetStateAction<Song[]>>, playlists: Playlist[], name: RefObject<string>};
    connect: (url: string, token: string) => void;
    disconnect: () => void;
    url: RefObject<string>;
}
export const SocketContext = createContext<SocketContextType | null>(null);