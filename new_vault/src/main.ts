import Server from "./core/classes/server.ts"
import { readFileSync } from "fs"
import type VaultOptions from "./types/config.d.ts";
import { env } from "process";
import auth from "./auth/auth.ts";
import verifyUser from "./auth/verify_user.ts";
import { registerVault } from "./auth/register_vault.ts";
import Song from "./core/classes/song.js";
import type { Response } from "express";
import { fileTypeFromBuffer } from "file-type";
import { rm } from "fs/promises";
const logger = {
    info: (str: string) => {
        const date = new Date();
        console.log(`[INFO] ${date.toISOString()} - ${str}`);
    },
    warn: (str: string) => {
        const date = new Date();
        console.warn(`[WARN] ${date.toISOString()} - ${str}`);
    },
    error: (str: string) => {
        const date = new Date();
        console.error(`[ERROR] ${date.toISOString()} - ${str}`);
    }
}


const data = env.CONTAINER ? readFileSync(env.CONFIG_PATH, 'utf-8') : readFileSync('./config.json', 'utf-8');
const config: VaultOptions = JSON.parse(data);
console.log(config)
let gracefulShutdownIndicator = false;

const gracefulShutdown = async (server: Server) => {
    if (gracefulShutdownIndicator) return;
    gracefulShutdownIndicator = true;
    logger.info('Registering vault as offline...');
    try {
        await registerVault(config, 'offline');
    } catch (error) {
        logger.error(`Error registering vault as offline: ${(error instanceof Error) ? error.message : String(error)}`);
    }
    
    logger.info('Gracefully shutting down server...');
    server.stop();
    logger.info('Closing database...');
    server.database.close();
    logger.info('Server shut down complete.');
    process.exit(0);
    
}


if (!config.name) config.name = "Untitled Vault";
if (!config.backend) config.backend = "https://api.jcamille.dev/vaulttune";
if (!config.token) throw new Error("No authentication token found");

const authData = await auth(config.token,config.backend)

const server = new Server(
    config,
    logger
);

server.logger.info(`Vault initialized with auth data: ${JSON.stringify(authData)}`);
server.authHandshake = (socket) => new Promise((resolve, reject) => {
    const token = socket.handshake.auth.token;
    verifyUser(socket, token, config.backend, config.token).then(() => {
        logger.info(`User ${socket.data.auth.displayName} authenticated successfully.`);
        logger.info(`Vault owner ID: ${authData.user.uid}`);
        logger.info(`Connected user ID: ${socket.data.auth.uid}`);
        if (authData.user.uid === socket.data.auth.uid) {
            logger.info(`User ${socket.data.auth.displayName} is the vault owner.`);
            socket.data.auth.isOwner = true;
            socket.emit("owner");
        } else {
            socket.data.auth.isOwner = false;
        }
    }).then(() => resolve()).catch((error) => {
        logger.warn(`User authentication failed: ${(error instanceof Error) ? error.message : String(error)}`);
        reject(error);
    });
});

server.io.on("connection", (socket) => {
    socket.on('share song', (song: Song) => {
        logger.info(`User ${socket.data.auth.displayName} requested to share song with ID: ${song.id}`);
        const existingShare: any = server.database.db.prepare(`SELECT * FROM shared_songs WHERE song_id = ? AND (expires_at IS NULL OR expires_at > ?) LIMIT 1;`).get(song.id, Date.now());
        if (existingShare) {
            logger.info(`Existing share found for song ID: ${song.id} with share ID: ${existingShare.share_id}`);
            socket.emit('share created', existingShare.share_id);
            return;
        }
        fetch(`${config.backend}/api/share/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: config.token,
                songId: song.id
            })
        }).then(async (res) => {
            const data = await res.json();
            if (data.status === "success") {
                const shareId = data.shareId;
                server.database.db.prepare(`INSERT INTO shared_songs (share_id, song_id, expires_at) VALUES (?, ?, ?);`)
                    .run(shareId, song.id, null);
                logger.info(`Share created successfully with ID: ${shareId} for song ID: ${song.id}`);
                socket.emit('share created', shareId);
                return;
                
            }
        }).catch((error) => {
            logger.error(`Error creating share for song ID ${song.id}: ${(error instanceof Error) ? error.message : String(error)}`);
            socket.emit('error', "Failed to create share: " + ((error instanceof Error) ? error.message : String(error)));
        });

    });
    socket.on('edit song', async (updatedSong: Song) => {
        try {
            logger.info(`User ${socket.data.auth.displayName} requested to edit song with ID: ${updatedSong.id}`);
            const song = server.database.getSong(updatedSong.id);
            if (!song) {
                logger.warn(`Song with ID: ${updatedSong.id} not found for editing.`);
                socket.emit('error', "Song not found");
                return;
            }
            const coverImg = updatedSong.coverImage && updatedSong.coverImage !== song.coverImage && ( updatedSong.coverImage as unknown as Buffer )
            if (coverImg) {
                logger.info(`Updating cover image for song ID: ${updatedSong.id}`);
                const format = await fileTypeFromBuffer(coverImg);
                await song.setImageBuffer(coverImg, format ? format.mime : 'image/jpeg');

            }
            
            logger.info(`Updating metadata for song ID: ${updatedSong.id}`);
            server.database.db.prepare(`UPDATE songs SET title = ?, artists = ?, album = ?, coverImage = ? WHERE id = ?;`).run(
                updatedSong.title,
                JSON.stringify(updatedSong.artists),
                updatedSong.album,
                "something", // cover image is handled separately
                updatedSong.id
            );
            server.logger.info(`Song with ID: ${updatedSong.id} updated successfully.`);
            const refreshedSong = server.database.getSong(updatedSong.id);
            server.io.emit('song updated', refreshedSong);
        } catch (error) {
            logger.error(`Error editing song with ID ${updatedSong.id}: ${(error instanceof Error) ? error.message : String(error)}`);
            socket.emit('error', "Failed to edit song: " + ((error instanceof Error) ? error.message : String(error)));
        }
    });
    socket.on('delete song', (song: Song) => {
        logger.info(`User ${socket.data.auth.displayName} requested to delete song with ID: ${song.id}`);
        const existingSong = server.database.getSong(song.id);
        if (!existingSong) {
            logger.warn(`Song with ID: ${song.id} not found for deletion.`);
            socket.emit('error', "Song not found");
            return;
        }
        rm(existingSong.path);
    });
    socket.on('sle song seeked', (time) => {
        const sle = server.sles.get(socket.data.sle || "");
        const usr = sle.users.get(socket.id);
        
        if (!sle) {
            socket.emit("error","SLE not active.");
            return;
        }
        if (!usr) {
            logger.error("User is not a member of SLE");
            socket.emit("error", "User is not a member of SLE");
            return;
        }
        sle.users.forEach((user) => {
            user.emit("sle song seeked", socket.id, time);
        })
    })
});
// share feature
server.database.db.prepare(`CREATE TABLE IF NOT EXISTS shared_songs (
    share_id TEXT PRIMARY KEY,
    song_id TEXT NOT NULL,
    expires_at INTEGER,
    FOREIGN KEY(song_id) REFERENCES songs(id)
);`).run();
server.app.get('/share/:songId/data', async (req, res: Response) => {
    const songId = req.params.songId;
    const stmt = server.database.db.prepare(
        `SELECT * FROM shared_songs 
        JOIN songs ON shared_songs.song_id = songs.id 
        WHERE shared_songs.share_id = ?;`);
    const sharedSong: any = stmt.get(songId);
    if (!sharedSong) {
        res.status(404).json({status: "failed", error: "Shared song not found"});
        return;
    }
    const song = server.database.getSong(sharedSong.song_id);
    const coverBuffer = await song.getImageBuffer();
    if (coverBuffer) {
        song.coverImage = coverBuffer.toString('base64');
    }
    server.logger.info(`Data for shared song ID ${songId} sent.`);
    res.status(200).json({...song});
});
server.app.get('/share/:songId/buffer', async (req, res: Response) => {
    const songId = req.params.songId;
    const stmt = server.database.db.prepare(
        `SELECT * FROM shared_songs 
        JOIN songs ON shared_songs.song_id = songs.id 
        WHERE shared_songs.share_id = ?;`);
    const sharedSong: any = stmt.get(songId);

    const song = server.database.getSong(sharedSong.song_id);
    const buffer = await song.getBuffer();
    if (!sharedSong) {
        res.status(404).json({status: "failed", error: "Shared song not found"});
        return;
    }
    server.logger.info(`Buffer for shared song ID ${songId} sent.`);
    res.send(buffer);
});

process.on('uncaughtException', (err) => {
    logger.error(`Uncaught Exception: ${(err instanceof Error) ? err.stack : String(err)}`);
    gracefulShutdown(server);
});
process.on('SIGINT', () => {
    gracefulShutdown(server);
});
process.on('SIGTERM', () => {
    gracefulShutdown(server);
});

process.on('exit', () => {
    logger.info('Process exit event triggered.');
    gracefulShutdown(server);
})

try {
    server.start(config.port);
    registerVault(config, 'online');
} catch (error) {
    logger.error(`Failed to initialize server: ${(error instanceof Error) ? error.message : String(error)}`);
}

export { server };