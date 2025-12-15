import { Socket } from "socket.io";
import Song from "../classes/song.ts";
import Playlist from "../classes/playlist.ts";

export enum SongStatus {
    UPLOADED = 'UPLOADED',
    SYSTEM = 'SYSTEM',
}

export class ServerOptions {
    public network?: boolean;
    public name?: string | "Untitled Vault";
    public token?: string | null;
    public api?: string;
}

export interface Options extends ServerOptions {
    rooms: Room[];
    users?: string[];
}

export interface SongOptions {
    path?: string;
    id?: string;
}

export interface User {
    uid: string;
    name: string;
    email: string;
    avatar?: string;
    status?: 'connected' | 'disconnected';
}

export interface PendingRequest {
    vault_id: string;
    owner: User;
    vault_name: string;
    status: 'pending' | 'accepted' | 'rejected';
    created_at: string;
    email: string;
}

export interface Room {
    id?: string;
    name: string;
    dirs: string[];
}

export interface ConnectedUser extends Socket {
    data: {
        auth?: {
            uid: string;
            email: string;
            displayName: string;
            photoURL: string;
        };
        sle: string | null;
    };
}

export interface VaultData {
    name?: string;
    songs: Song[];
    playlists: Playlist[];
    users?: User[];
    
}

export interface VaultOptions {
    id?: string;
    song_dir: string;
}

export interface Logger {
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
}

export class SLE { // shared listening experience
    id: string;
    users: Map<string, ConnectedUser>;
    currentSong: Song | null;
    isPlaying: boolean;
    timestamp: number; // when the song started playing
    constructor(id: string) {
        this.id = id;
        this.users = new Map();
        this.currentSong = null;
        this.isPlaying = false;
        this.timestamp = 0;
    }
}


export class SongError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SongError';
        Object.setPrototypeOf(this, SongError.prototype);
    }
}