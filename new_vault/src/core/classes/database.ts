import { readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import betterSqlite3 from 'better-sqlite3'
import Song from './song.ts';
import { IPicture } from 'music-metadata';
import Playlist from './playlist.ts';


export default class Database {
    public db : betterSqlite3.Database;

    private createTables() {
        this.db.exec(`CREATE TABLE songs (
                id TEXT PRIMARY KEY,
                title TEXT DEFAULT 'Untitled Song',
                artists TEXT DEFAULT 'Unknown Artist',
                album TEXT DEFAULT 'Unknown Album',
                duration INTEGER DEFAULT 0,
                path TEXT,
                coverImage TEXT, -- path to cover image or base64,
                mime TEXT DEFAULT 'audio/mpeg'
            );`);

        this.db.exec(`CREATE TABLE playlists (
                id TEXT PRIMARY KEY,
                name TEXT DEFAULT 'Untitled Playlist',
                album_cover TEXT, -- base64 image
                songs TEXT -- json array of song IDs
            );`);
    }

    validateDatabase(): boolean {
        try {
            const row = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='songs';");
            const result = row.get();
            return result !== undefined;
            console.log('Database validated successfully.');
        } catch (error) {
            console.error("Database validation error:", error);
            return false;
        }
    }

    constructor(dbPath: string = `${homedir()}/VaultTune/music_library.db`) {
        this.db = new betterSqlite3(dbPath);
        this.db.pragma('journal_mode = WAL');

        if (!this.validateDatabase()) {
            this.createTables();
        }
        
    }

    addSong(song: Song) {
        const stmt = this.db.prepare(`INSERT INTO songs (
            id, 
            title, 
            artists, 
            album, 
            duration, 
            path, 
            coverImage,
            mime
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`);
        const result = stmt.run(song.id, 
                                song.title, 
                                JSON.stringify(song.artists), 
                                song.album, 
                                song.duration, 
                                song.path, 
                                song.coverImage,
                                song.mime);
        
        if (result.changes === 0) {
            console.error("Failed to add song to database:", song);
            return false;
        }
        return true;
    }
    removeSong(id: string) {
        const stmt = this.db.prepare(`DELETE FROM songs WHERE id = ?;`);
        const result = stmt.run(id);
        return result.changes > 0;
    }
    getSong(id: string): Song | null {
        const stmt = this.db.prepare(`SELECT * FROM songs WHERE id = ?;`);
        const row: Song = stmt.get(id) as Song;
        if (!row) {
            return null;
        }
        return new Song(
            id, 
            row.title, 
            JSON.parse(row.artists as unknown as string) as string[], 
            row.album, 
            row.duration, 
            row.coverImage,
            row.path,
            row.mime
        );
    }
    getSongByPath(path: string): Song | null {
        const stmt = this.db.prepare(`SELECT * FROM songs WHERE path = ?;`);
        const row: Song = stmt.get(path) as Song;
        if (!row) {
            return null;
        }
        return new Song(
            row.id, 
            row.title, 
            JSON.parse(row.artists as unknown as string) as string[], 
            row.album, 
            row.duration, 
            row.coverImage,
            row.path
        );
    }
    getSongs(offset: number, limit: number): Song[] {
        const stmt = this.db.prepare(`SELECT * FROM songs LIMIT ? OFFSET ?;`);
        const rows: Song[] = stmt.all(limit, offset) as Song[];
        return rows.map(row => new Song(
            row.id, 
            row.title, 
            JSON.parse(row.artists as unknown as string) as string[], 
            row.album, 
            row.duration, 
            row.coverImage,
            row.path,
            row.mime
        ));
    }
    getTotalSongs(): number { 
        const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM songs;`);
        const row = stmt.get() as { count: number };
        return row.count;
    }
    getAllSongs(): Song[] {
        const stmt = this.db.prepare(`SELECT * FROM songs;`);
        const rows: Song[] = stmt.all() as Song[];
        return rows.map(row => new Song(
            row.id, 
            row.title, 
            JSON.parse(row.artists as unknown as string) as string[], 
            row.album, 
            row.duration, 
            row.coverImage,
            row.path,
            row.mime
        ));
    }
    totalSongs(): number {
        const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM songs;`);
        const row = stmt.get() as { count: number };
        return row.count;
    }
    addPlaylist(playlist: Playlist) {
        const stmt = this.db.prepare(`INSERT INTO playlists (
            id, 
            name, 
            album_cover, 
            songs
            ) VALUES (?, ?, ?, ?);`);
        const result = stmt.run(playlist.id, 
                                playlist.name, 
                                playlist.album_cover, 
                                JSON.stringify(playlist.songs));
    
        if (result.changes === 0) {
            console.error("Failed to add playlist to database:", playlist);
            return false;
        }
        return true;
    }
    removePlaylist(id: string) {
        const stmt = this.db.prepare(`DELETE FROM playlists WHERE id = ?;`);
        const result = stmt.run(id);
        return result.changes > 0;
    }
    getPlaylist(id: string): Playlist | null {
        const stmt = this.db.prepare(`SELECT * FROM playlists WHERE id = ?;`);
        const row: Playlist = stmt.get(id) as Playlist;
        if (!row) {
            return null;
        }
        const playlist = new Playlist(row.name);
        playlist.id = row.id;
        playlist.album_cover = row.album_cover;
        playlist.songs = JSON.parse(row.songs as unknown as string) as string[];
        return playlist;
    }
    getAllPlaylists(): Playlist[] {
        const stmt = this.db.prepare(`SELECT * FROM playlists;`);
        const rows: Playlist[] = stmt.all() as Playlist[];
        return rows.map(row => {
            const playlist = new Playlist(row.name);
            playlist.id = row.id;
            playlist.album_cover = row.album_cover;
            playlist.songs = JSON.parse(row.songs as unknown as string) as string[];
            return playlist;
        });
    }
    close() {
        this.db.close();
    }


}