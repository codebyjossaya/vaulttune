import { IAudioMetadata, IPicture } from "music-metadata/lib";
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