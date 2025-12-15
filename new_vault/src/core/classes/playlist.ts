import { IPicture } from "music-metadata";
import Song from "./song.ts";

export default class Playlist {
    public songs: Song[]
    public name: string;
    public album_cover?: IPicture;
    public id: string;
    constructor(name: string) {
        this.name = name
        const date: Date = new Date();
        const timestamp: string = date.toISOString();
        const random = Math.floor(Math.random() * 1000000);
        this.id = `playlist_${timestamp}_${random}`;
        this.songs = [];
    }
    addSong(song: Song) {
        if(this.songs.length == 0 && song.metadata.common.picture) this.album_cover = song.metadata.common.picture[0]    
        this.songs.push(song);
    }
    removeSong(song: Song) {
        this.songs = this.songs.filter(member => member.path !== song.path)
    }
    getSongs() {
        return this.songs.map(song => {
            return {
                id: song.id,
                path: song.path
            }
        })
    }
    exportPlaylist() {
        return {
            songs: this.getSongs(),
            name: this.name
        }
    }
}