import { Socket } from "socket.io";
import Song from "../core/classes/song.ts";
import Playlist from "../core/classes/playlist.ts";
import { IAudioMetadata } from "music-metadata";

export enum SongStatus {
    UPLOADED = 'UPLOADED',
    SYSTEM = 'SYSTEM',
}

export interface SongOptions {
    path?: string;
    id?: string;
    metadata?: IAudioMetadata;
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
    songs: Song[];
    playlists: Playlist[];
    users?: User[];
    
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
