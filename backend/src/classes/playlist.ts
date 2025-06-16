import { IPicture } from "music-metadata/lib";
import Song from "./song";

export default class Playlist {
    private songs: Song[]
    public name: string;
    public album_cover: IPicture;
    public id: string;
    constructor(name: string) {
        this.name = name
        const date: Date = new Date();
        const timestamp: string = date.toISOString();
        const random = Math.floor(Math.random() * 1000000);
        this.id = `playlist_${timestamp}_${random}`;
    }
    addSong(song: Song) {
        if(this.songs.length == 0) this.album_cover = song.metadata.common.picture[0]    
        this.songs.push(song)
    }
    removeSong(song: Song) {
        this.songs = this.songs.filter(member => member.path !== song.path)
    }
    getSongs() {
        return this.songs.map((song:Song) => song.exportSong());
    }
    exportPlaylist() {
        return {
            songs: this.getSongs(),
            name: this.name
        }
    }
}