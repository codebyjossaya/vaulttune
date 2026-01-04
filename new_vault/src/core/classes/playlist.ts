import Song from "./song.ts";

export default class Playlist {
    public songs: string[]
    public name: string;
    public album_cover?: string;
    public id: string;
    constructor(name: string) {
        this.name = name
        const date: Date = new Date();
        const timestamp: string = date.toISOString();
        const random = Math.floor(Math.random() * 1000000);
        this.id = `playlist_${timestamp}_${random}`;
        this.songs = [];
    }
    async addSong(song: Song) {
        if(this.songs.length == 0 && song.coverImage) {
            const coverBuffer = await song.getImageBuffer();
            if (coverBuffer) {
                this.album_cover = coverBuffer.toString('base64');
            }
        }
        this.songs.push(song.id);
    }
    removeSong(song: Song) {
        this.songs = this.songs.filter(member => member !== song.id)
    }

}