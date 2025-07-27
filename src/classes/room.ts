import { Socket } from "socket.io";
import Song from "./song";
import Playlist from "./playlist";
import { readdirSync, writeFileSync } from "fs";
import { SongStatus } from "../interfaces/types";
import {watch} from 'chokidar'
import { basename } from "path";
import { SongError } from "../interfaces/errors";

export default class Room {
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
        this.dirs = [];

        const date: Date = new Date();
        const timestamp: string = date.toISOString();
        const random = Math.floor(Math.random() * 1000000);
        this.id = (id === undefined) ? `room_${timestamp}_${random}` : id;
    }
    addMember(socket: Socket): void {
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
            // check if the path exists
            const files = readdirSync(path);
            if (files.length === 0) {
               return {success: false, error: "The directory is empty."};
            }
            console.log(`Adding songs in ${path}`)
            this.dirs.push(path)

            // begin watching the folder for new changes
            const watcher = watch(path, {persistent: true})
            watcher.on('add', async (filePath: string) => {
                console.log(`${filePath} was added`);
                const song_name = basename(filePath)
                if (!allowedExtensions.some(ext => song_name.toLowerCase().endsWith(ext))) {
                    console.log(`File ${song_name} is not a valid audio file. Skipping.`);
                    return;
                }
                try {
                    if (this.songs.find(song => song.path === filePath)) {
                        console.log(`Song ${song_name} already exists in the room. Skipping.`);
                        return;
                    }
                    console.log(`Adding song ${song_name} to the room`);
                    this.songs.push(await Song.create(SongStatus.SYSTEM, null, {path: filePath}));
                } catch (error) {
                    console.log(error instanceof SongError);
                    if (error instanceof SongError) {
                        console.error(`Error adding song ${song_name}: ${error.message}`);
                        return;
                    }
                    else throw error;
                }
                
                
                for (const socket of this.members) {
                    socket.emit("songs", this.exportSongs())
                }
            }) 
            watcher.on('unlink', (path) => {
                console.log(`${path} was removed`);
                this.songs = this.songs.filter(song => song.path !== path);
                for (const socket of this.members) {
                    socket.emit("songs", this.exportSongs())
                }
                
            }) 
            return {success: true, error: undefined};
        } catch (error: any) {
            return {success: false, error: error.message};
        }
    }
    addPlaylist(playlist: Playlist) {
        this.playlists.push(playlist);
        this.members.forEach(member => member.emit("playlists", this.playlists));
    }
    export() {
        const data = {
            id: this.id,
            name: this.name,
            songs: this.songs.map(song => {return song.exportSong()}),
            playlists: this.playlists.map((playlist: Playlist) => {
                return {
                    name: playlist.name,
                    songs: playlist.getSongs()
                }
            }),
            dirs: this.dirs
        }
        return data;
    }
    static async fromJSON(data: { songs: Song[]; playlists: Playlist[]; dirs: string[]; name: string; id: string; }): Promise<Room> {
        const songs: Song[] = [];
        const playlists: Playlist[] = [];
        for(const song of data.songs) {
            console.log(`Creating song from path: ${song.path} with id: ${song.id}`);
            songs.push(await Song.create(SongStatus.SYSTEM, null, {path: song.path, id: song.id}));
        }
        for (const playlist of data.playlists) {
            const new_playlist = new Playlist(playlist.name);
            for (const song of playlist.songs) {
                const existing_song = songs.find(element => element.id === song.id);
                if (existing_song === undefined) {
                    const new_song = await Song.create(SongStatus.SYSTEM, null, {path: song.path, id: song.id});
                    songs.push(new_song)
                    new_playlist.addSong(new_song)
                } else new_playlist.addSong(existing_song)
            }
            playlists.push(new_playlist)
        }
        const room = new Room(
            data.name,
            data.id,
            songs,
            playlists
        );
        for (const dir of data.dirs) {
            const status = await room.addSongDir(dir);
            if (!status.success) {
                console.error(`Error adding song directory ${dir} to room ${room.name}. Error: ${status.error}`);
            }
        }

        return room;
    }
    exportSongs() {
        return this.songs.map((song) => song.exportSong())
    }
}
