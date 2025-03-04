import { Song } from "./song";

export class Playlist {
   private songs: Song[]
   public name: string;
   constructor(name: string) {
    this.name = name
   }
   addSong(song: Song) {
    this.songs.push(song)
   }
   removeSong(song: Song) {
    this.songs = this.songs.filter(member => member.path !== song.path)
   }
    getSongs() {
        return this.songs.map((song:Song) => song.exportSong());
    }
}