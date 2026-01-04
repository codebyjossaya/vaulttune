import { Server as IOServer, Socket } from "socket.io";
import { createServer } from "http";
import cors from "cors";
import express from "express";
import { ConnectedUser, VaultData, Logger, SongStatus, SLE } from "../../types/server_types.ts";
import type VaultOptions  from "../../types/config.d.ts";
import { watch } from "chokidar"
import Song from "./song.ts";
import { basename } from "path";
import handleJoinSLE from "../helpers/sle/handle_join_sle.js";
import handleCreateSLE from "../helpers/sle/handle_create_sle.js";
import handleLeaveSLE from "../helpers/sle/handle_leave_sle.js";
import handlePlaySong from "../helpers/playback/handle_play_song.js";
import handleSongDataReady from "../helpers/playback/handle_song_ready.js";
import handleStopSong from "../helpers/playback/handle_stop_song.js";
import handleCreatePlaylist from "../helpers/playlist/handle_create_playlist.js";
import Database from "./database.ts";
import { handleUploadSong } from "../helpers/handle_upload_song.ts";
import path from "path";
export default class Server {
    public io: IOServer;
    public app: express.Application;
    public users: ConnectedUser[] = [];
    public httpServer: ReturnType<typeof createServer>;
    public options: VaultOptions;
    public logger: Logger;
    public stoppers: Map<string, NodeJS.Timeout> = new Map();
    public authHandshake: (socket: Socket) => Promise<void | Error> = async (socket: Socket) => { return null};    // Shared Listening Experiences
    public sles: Map<string, SLE> = new Map();
    public database: Database;

    constructor(options?: VaultOptions, logger?: Logger, authHandshake?: (socket: Socket) => Promise<void>) {
        this.options = options;
        if (logger) this.logger = logger;
        else this.logger = {info: console.log, error: console.error, warn: console.warn};

        this.logger.info("Initializing server...");
        this.authHandshake = authHandshake || (async () => {
            return;
        });
        this.app = express();
        this.app.use(cors({
            origin: '*', // NOTE: Use specific origins in production!
            methods: ['GET', 'POST', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'bypass-tunnel-reminder', 'X-Pinggy-No-Screen', "Access-Control-Allow-Origin", "Access-Control-Request-Headers"],
        }))

        this.httpServer = createServer(this.app);
        this.logger.info("Setting up Socket.io...");
        this.io = new IOServer(this.httpServer, {
            cors: {
                origin: "*",
                methods: ["GET", "POST","OPTIONS"],
                credentials: true,
                exposedHeaders: ["Access-Control-Allow-Origin", "Access-Control-Request-Headers"]
            },
            maxHttpBufferSize: 2e11
        });

        this.io.use(async (socket, next) => {
            this.logger.info(`Socket attempting to connect: ${socket.id}`);
            try {
                await this.authHandshake(socket);
            } catch (error) {
                console.log('auth err')
                next(new Error('Authentication error'));
                return;
            }
            next();
        })

        this.io.on("connection", (socket: ConnectedUser) => {
            this.logger.info(`New client connected: ${socket.id}`);
            this.users.push(socket);
            socket.on("disconnect", () => {
                this.logger.info(`Client disconnected: ${socket.id}`);
                this.users = this.users.filter(user => user.id !== socket.id);

                const sle = this.sles.get(socket.data.sle || "");
                if (sle) {
                    sle.users.delete(socket.id);
                    if (sle.users.size === 0) {
                        this.sles.delete(sle.id);
                        this.logger.info(`SLE ${sle.id} deleted due to no users remaining.`);
                    }
                }
                this.users = this.users.filter(user => user.id !== socket.id);
            });
            this.logger.info(`Emitting initial data to client: ${socket.id}`);
            const songs = this.database.getSongs(0, 25);
            const total = this.database.getTotalSongs();
            const playlists = this.database.getAllPlaylists();
            socket.emit("songs", songs, total);
            socket.emit("playlists", playlists);
            socket.emit("sles", Array.from(this.sles.keys()));

            socket.on('get songs', async (offset: number) => {
                this.logger.info(`Client ${socket.id} requested songs with offset ${offset}`);
                const songs = this.database.getSongs(offset, 25);   
                const total = this.database.getTotalSongs();
                socket.emit("songs", songs, total);
            });
            socket.on("create sle", () => {handleCreateSLE(this, socket);});
            socket.on("join sle", (sle_id: string) => {handleJoinSLE(this, socket, sle_id);});
            socket.on("leave sle", () => {handleLeaveSLE(this, socket)});
            // playback events
            socket.on("play song", async (song: Song) => {handlePlaySong(this, socket, song)});
            socket.on("song data ready", (song: Song, iOSMode?: boolean) => {handleSongDataReady(this, socket, song, iOSMode)});
            socket.on("stop song", (song: Song) => {handleStopSong(this, socket, song)});
            socket.on("sle seek song", (timestamp: number) => {}); // TODO

            // upload
            socket.on("upload song", async (buf: Buffer, metadata?: any) => handleUploadSong(this, socket, buf, metadata));
            // playlist events
            socket.on("create playlist", (name: string, song_ids: string[]) => {
                handleCreatePlaylist(this, socket, name, song_ids)
            });
        });
        this.logger.info("Connecting to database...");
        this.database = new Database();

        this.logger.info("Setting up file watcher...");
        const watcher = watch(this.options.song_dir, {ignored: /(^|[\/\\])\../, persistent: true});
        watcher.on('add', async (filePath: string) => {
            this.logger.info(`${filePath} was added`);
            if (filePath.includes("assets")) {
                this.logger.info(`File ${basename(filePath)} is in assets directory. Skipping.`);
                return;
            }
            if (filePath.includes("uploads")) {
                this.logger.info(`File ${basename(filePath)} is in uploads directory. Skipping.`);
                return;
            }
            const songExists = this.database.getSongByPath(filePath);
            if (songExists) {
                this.logger.info(`Song ${basename(filePath)} already exists in the database. Skipping.`);
            } else {
                const id = songExists ? songExists.id : null;
                const song = await Song.create(SongStatus.SYSTEM, null, {path: filePath, id});
                this.database.addSong(song);
            } 
        });

        watcher.on('unlink', (path) => {
            console.log(`${path} was removed`);
            const song = this.database.getSongByPath(path);
            
            if (!song) {
                console.log(`Song ${basename(path)} not found in the room. Skipping.`);
                return;
            }
            this.database.removeSong(song?.id || "");
            this.io.emit("song removed", song);
        });
        this.logger.info("Setting up asset server...");
        
        this.app.get('/photo/:songId', (req, res) => {
            const {socketId} = req.query
            if (!socketId || Array.isArray(socketId) || !this.users.find(u => u.id === socketId)) {
                res.status(401).send("Unauthorized: Missing or invalid socket ID");
                return;
            }

            const songId = req.params.songId;
            const song = this.database.getSong(songId);
            if (!song) {
                res.status(404).send("Song not found");
                return;
            }
            song.getImageBuffer().then((imgBuffer) => {
                if (!imgBuffer) {
                    res.status(404).send("Image not found");
                    return;
                }
                res.setHeader("Content-Type", "image/jpeg");
                res.send(imgBuffer);
            }).catch((error) => {
                this.logger.error(`Error retrieving image for song ID ${songId}: ${error}`);
                res.status(500).send("Internal server error");
            });
        });
        this.logger.info("Server initialized successfully.");
    }

    start(port: number = 3201) {
        this.httpServer.listen(port, () => {
            this.logger.info(`Server is running on port ${port}`);
        });
        
    }
    stop() {
        this.io.close(() => {
            this.logger.info("Server has been stopped.");
        });
        this.httpServer.close();
    }

}
