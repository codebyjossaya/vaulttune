import { Socket } from "socket.io";
import { Song } from "./song";
import { Playlist } from "./playlist";
import { readdirSync, readFileSync, writeFileSync } from "fs";
import { SongStatus } from "../types";

export class Room {
    public id: string;
    public name: string;
    public members: Socket[];
    public songs: Song[] = [];
    public playlists: Playlist[] = [];
    public dirs: string[] = [];

    constructor(name: string, id: string | undefined = undefined, songs: Song[] = [], playlists: Playlist[] = []) {
        this.members = [];
        this.name = name;
        this.songs = songs;
        this.playlists = playlists;

        const date: Date = new Date();
        const timestamp: string = date.toISOString();
        const random = Math.floor(Math.random() * 1000000);
        this.id = (id === undefined) ? `room_${timestamp}_${random}` : id;
    }
    addMember(socket: Socket) {
        socket.join(this.id);
        this.members.push(socket);
    }
    removeMember(socket: Socket) {
        socket.leave(this.id);
        this.members = this.members.filter(member => member.id !== socket.id);
    }
    getMembers() {
        return this.members;
    }
    async addSongDir(path: string): Promise<{ success: boolean; error?: string }> {
        try {
            const allowedExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.wma'];
            console.log(`Adding songs in ${path}`)
            this.dirs.push(path)
            const songs = readdirSync(path);
            console.log(`Songs: ${songs}`)
            for(const song of songs) {
                if (!allowedExtensions.some(ext => song.toLowerCase().endsWith(ext))) continue;
                this.songs.push(await Song.create(SongStatus.SYSTEM, null, {path: path + "/" +song}));
            }
            return {success: true, error: undefined};
        } catch(error) {
            return {success: false, error: error};
        }
    }
    exportSettings() {
        const data = {
            id: this.id,
            name: this.name,
            songs: this.songs.map(song => {return song.exportSong()}),
            playlists: this.playlists.map((playlist: Playlist) => {
                return {
                    name: playlist.name,
                    songs: playlist.getSongs()
                }
            })
        }
        writeFileSync(`${__dirname}/../../settings/rooms/${this.name}.json`,JSON.stringify(data));
    }
    static async readSettings(name: string): Promise<Room> {
        const data = JSON.parse(readFileSync(`${__dirname}/../../settings/rooms/${name}.json`,`utf-8`));
        const songs: Song[] = [];
        const playlists: Playlist[] = [];

        for(const song of data.songs) {
            songs.push(await Song.create(SongStatus.SYSTEM, null, {path: song.path}))
        }
        for (const playlist of data.playlists) {
            const new_playlist = new Playlist(playlist.name);
            for (const song of playlist.songs) {
                const existing_song = songs.find(element => element.id === song.id);
                if (existing_song === undefined) {
                    const new_song = await Song.create(SongStatus.SYSTEM, null, {path: song.path})
                    songs.push(new_song)
                    new_playlist.addSong(new_song)
                } else new_playlist.addSong(existing_song)
            }
            playlists.push(new_playlist)
        }
        return new Room(
            data.name,
            data.id,
            songs,
            playlists
        );
        
    }
}