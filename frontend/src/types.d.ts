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


export interface PlayerConfig {
    socket: Socket | undefined;
    user: User | null;
    vault: Vault | undefined;
    signOut: () => Promise<void>;
}


export interface userVault {
    id: string;
    vault_name: string;
    status: string;
}


export interface VaultRequest {
    vault_id: string;
    owner: UserRecord;
    email: string;
    vault_name: string;
    created_at: string;
}
export interface UserVaultData {
    requests: VaultRequest[];
    [vaultId: string]: userVault;
}