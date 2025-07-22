import { User } from "firebase/auth";
import { IAudioMetadata, IPicture } from "music-metadata/lib";
import { Socket } from "socket.io-client";
import { User } from "firebase/auth";
export interface Song {
    metadata: IAudioMetadata;
    id: string;
    size: number;
    artist_str: string;
}

export interface Room {
    id: string;
    name: string;
}

export interface Playlist {
    songs: Song[],
    name: string,
    album_cover: IPicture,
    id: string,
}


export interface SongChunk {
    buffer: ArrayBuffer,
    chunk_counter: number
}

export interface Vault {
    tunnel_url: string;
    users: string[];
    vault_name: string;
    id: string;
    status: "online" | "offline" | "error";
}

export interface PlayerConfig {
    socket: Socket | undefined;
    user: User | null;
    vault: Vault | undefined;
    signOut: () => Promise<void>;
}

export interface PendingRequest {
    vault_id: string;
    owner: User;
    email: string;
    vault_name: string;
    status: "pending" | "accepted" | "rejected";
    created_at: string;
}