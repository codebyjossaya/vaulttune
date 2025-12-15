import { IAudioMetadata, IPicture } from "music-metadata";

export interface serverToken {
    id: string;
    user: UserRecord;
}

export interface userVault {
    id: string;
    vault_name: string;
    status: string;
    owner?: {uid: string; name: string};
}

export interface Vault {
    id: string;
    requests: VaultRequest[];
    vault_name: string;
    tunnel_url : string
    owner: UserRecord;
    users: string[];
    status: "offline" | "online";
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

export interface Song {
    id: string;
    metadata: IAudioMetadata;
}
export interface Playlist {
    songs: Song[];
    name: string;
    album_cover?: IPicture;
    id: string;
}