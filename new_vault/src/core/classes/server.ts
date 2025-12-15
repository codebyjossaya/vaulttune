import { Server as IOServer, Socket } from "socket.io";
import { createServer } from "http";
import cors from "cors";
import express from "express";
import { ConnectedUser, VaultData, Logger, SongStatus, SLE } from "../../types/server_types.ts";
import { VaultOptions } from "../../types/server_types.ts";
import { writeFile, mkdir} from "fs/promises"
import {existsSync} from "fs";
import { homedir } from "os";
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

export default class Server {
    public io: IOServer;
    public app: express.Application;
    public users: ConnectedUser[] = [];
    public httpServer: ReturnType<typeof createServer>;
    public options: VaultOptions;
    public data: VaultData = {songs: [], playlists: []};
    public logger: Logger;
    public stoppers: Map<string, NodeJS.Timeout> = new Map();
    public authHandshake: (socket: Socket) => Promise<any> = async (socket: Socket) => { return null};
    private modules: object[] = [];
    // Shared Listening Experiences
    public sles: Map<string, SLE> = new Map();

    constructor(options: VaultOptions = {song_dir: homedir()}, data?: VaultData, logger?: Logger, authHandshake?: (socket: Socket) => Promise<void>) {
        this.options = options;
        if (data) this.data = data;
        if (logger) this.logger = logger;
        else this.logger = {info: console.log, error: console.error, warn: console.warn};

        this.logger.info("Initializing server...");
        this.authHandshake = authHandshake || (async () => {});
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
            maxHttpBufferSize: 1e8
        });

        this.io.use(async (socket, next) => {
            this.logger.info(`Socket attempting to connect: ${socket.id}`);
            try {
                await this.authHandshake(socket);
            } catch (error) {
                next(new Error('Authentication error'));
                return;
            }
            next();
        })

        this.io.on("connection", (socket: ConnectedUser) => {
            this.logger.info(`New client connected: ${socket.id}`);
            this.users.push(socket);
            socket.on("disconnect", () => {
                this.logger.info(`Client disconnected: ${socket.data.auth?.uid}`);
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
            socket.emit("songs", this.data.songs);
            socket.emit("playlists", this.data.playlists);
            socket.emit("sles", Array.from(this.sles.keys()));

            socket.on("create sle", () => {handleCreateSLE(this, socket);});
            socket.on("join sle", (sle_id: string) => {handleJoinSLE(this, socket, sle_id);});
            socket.on("leave sle", () => {handleLeaveSLE(this, socket)});
            // playback events
            socket.on("play song", async (song: Song) => {handlePlaySong(this, socket, song)});
            socket.on("song data ready", (song: Song) => {handleSongDataReady(this, socket, song)});
            socket.on("stop song", (song: Song) => {handleStopSong(this, socket, song)});
            socket.on("sle seek song", (timestamp: number) => {}); // TODO
            // playlist events
            socket.on("create playlist", (name: string, song_ids: string[]) => {handleCreatePlaylist(this, socket, name, song_ids)}); // TODO
        });

        this.logger.info("Setting up file watcher...");
        const watcher = watch(this.options.song_dir, {ignored: /(^|[\/\\])\../, persistent: true});
        watcher.on('add', async (filePath: string) => {
            this.logger.info(`${filePath} was added`);
            if (!this.data.songs.find(song => song.path === filePath)) {
                this.data.songs.push(await Song.create(SongStatus.SYSTEM, null, {path: filePath}));
            }
        });
        watcher.on('unlink', (path) => {
            console.log(`${path} was removed`);
            const song = this.data.songs.find(song => song.path === path);
            if (!song) {
                console.log(`Song ${basename(path)} not found in the room. Skipping.`);
                return;
            }
            this.io.emit("song removed", song);
            this.data.songs = this.data.songs.filter(song => song.path !== path);
        });
        
        this.logger.info("Server initialized successfully.");

    }

    start(port: number = 3201) {
        this.httpServer.listen(port, () => {
            this.logger.info(`Server is running on port ${port}`);
        });
    }

    async export() {
        const json = JSON.stringify({
            options: this.options, data: this.data
        }, null, 2);
        if (!existsSync(`${homedir()}/VaultTune/settings`)) {
            await mkdir(`${homedir()}/VaultTune/settings`, { recursive: true });
        }
        await writeFile(`${homedir()}/VaultTune/settings/server.json`, json);
        console.log("Server exported successfully to settings/server.json");
    }
    static async fromJSON(data: {options: VaultOptions, data: VaultData}): Promise<Server> {
        const server = new Server(data.options, data.data);
        return server;
    }

}
