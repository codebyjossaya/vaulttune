import { IAudioMetadata } from "music-metadata/lib";
export interface Song {
    metadata: IAudioMetadata;
    id: string;
    size: number;
}

export interface Room {
    id: string;
    name: string;
}

export interface Playlist {
    songs: Song[],
    name: string
}
