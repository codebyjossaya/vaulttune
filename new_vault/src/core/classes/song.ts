import {IAudioMetadata, parseBlob, parseBuffer } from 'music-metadata'
import { mkdir, readdir, readFile, rm, writeFile } from 'fs/promises'
import { SongOptions, SongStatus } from '../../types/server_types.js'
import { SongError } from '../../types/errors.js';
import { existsSync } from 'fs';
import path from 'path';
import { fileTypeFromBuffer } from 'file-type';
export default class Song {
    public id: string;
    public title: string;
    public artists: string[];
    public album: string;
    public duration: number
    public coverImage?: string;
    public path: string;
    public mime: string = 'audio/mpeg';
    
    constructor(id?: string, title?: string, artists?: string[], album?: string, duration?: number, coverImage?: string, songPath?: string, mime?: string) {
        this.path = songPath;
        const date: Date = new Date();
        const timestamp: string = date.toISOString();
        const random = Math.floor(Math.random() * 1000000);
        this.id = (id === undefined) ? `song_${timestamp}_${random}` : id;
        this.artists = (artists === undefined) ? ['Unknown Artist'] : artists;
        this.title = (title === undefined) ? 'Untitled Song' : title;
        this.album = (album === undefined) ? 'Unknown Album' : album;
        this.duration = (duration === undefined) ? 0 : duration;
        this.coverImage = coverImage;
        this.mime = mime ?? this.mime;
    }
       

    static async create(status: SongStatus, buf: Buffer | null, options: SongOptions): Promise<Song> {
        if (status === SongStatus.SYSTEM) {
            // Check if the file exists at the given path
            if (!existsSync(options.path!)) {
                throw new SongError(`Song file does not exist at path: ${options.path}`);
            }
            try {
                const buffer = await readFile(options.path!);
                const mimeType = await fileTypeFromBuffer(buffer);
                if (mimeType && !mimeType.mime.startsWith('audio/')) {
                    throw new SongError(`Invalid file type. Expected audio file, got: ${mimeType.mime}`);
                }
                const metadata = await parseBuffer(buffer);
                if (
                !metadata ||
                !metadata.common ||
                Object.keys(metadata.common).length === 0 ||
                !metadata.format ||
                Object.keys(metadata.format).length === 0
                ) {
                    throw new Error("No metadata found in the uploaded song");
                }
                
                const song =  new Song(
                    options.id ? options.id : undefined,
                    metadata.common.title,
                    metadata.common.artists || ['Unknown Artist'],
                    metadata.common.album || 'Unknown Album',
                    metadata.format.duration || 0,
                    metadata.common.picture ? `` : undefined,
                    options.path!,
                    mimeType ? mimeType.mime : 'audio/mpeg'
                );
                    const mimeMap = {
                        "image/jpeg": "jpg",
                        "image/png": "png",
                        "image/gif": "gif",
                        "image/webp": "webp",
                        "image/svg+xml": "svg",
                        "image/bmp": "bmp",
                    };
                let imageBasename: string | undefined = undefined;
                if (metadata.common.picture && metadata.common.picture.length > 0) {
                    console.log("Writing image...");
                    const exists = existsSync(path.join(path.dirname(options.path!), 'assets'));
                    if (!exists) await mkdir(path.join(path.dirname(options.path!), 'assets'));
                    imageBasename = `${song.id}.${mimeMap[metadata.common.picture[0].format || 'image/jpeg']}`;
                    await writeFile(`${path.dirname(options.path!)}/assets/${imageBasename}`, metadata.common.picture[0].data, {encoding: 'base64'});
                    song.coverImage = imageBasename;
                } else {
                    console.log("No cover image found in song", song.id);
                }
                return song;
            } catch (error) {
                throw new SongError(`Cannot read song: ${(error instanceof Error) ? error : String(error)}`)
            }
            
            
        } else if (status === SongStatus.UPLOADED) {
            if  (!(buf instanceof Buffer)) throw new Error("No buffer provided")
            
            const type = await fileTypeFromBuffer(buf);
            let mimeType = type ? type.mime : 'application/octet-stream';
            if (mimeType === 'audio/x-m4a') {
                
                mimeType = 'audio/m4a';
            }
            if (!mimeType.startsWith('audio/')) {
                throw new SongError(`Invalid file type. Expected audio file, got: ${mimeType}`);
            }
            let metadata: IAudioMetadata;
            if (!options.metadata) {
                metadata = await parseBuffer(buf!);
            } else {
                metadata = options.metadata;
            }
                // Throw error if metadata is missing or has no common tags or format info
                if (
                    !metadata ||
                    !metadata.common ||
                    Object.keys(metadata.common).length === 0 ||
                    !metadata.format ||
                    Object.keys(metadata.format).length === 0
                ) {
                    throw new SongError("No metadata found in the uploaded song");
                }
                const title = metadata.common.title|| 'Unknown_Title_UPLOADED'; // Default title if none exists
                const sanitizedTitle = title.replace(/[\\/:*?"<>|]/g, '_'); // Replace invalid filename characters
                metadata.common.title = sanitizedTitle;
            
            // Determine the file extension from metadata or use a default
            let extension = type ? type.ext : '';
            // generate unique ID for the song
            const date: Date = new Date();
            const timestamp: string = date.toISOString();
            const random = Math.floor(Math.random() * 1000000);
            const id = `song_${timestamp}_${random}`
            // Ensure upload directories exist
            const exists = existsSync(path.join(options.path!, 'uploads'));
            if (!exists) await mkdir(path.join(options.path!, 'uploads'));
            // write song file to disk
            const filePath = `${options.path!}/uploads/${sanitizedTitle}_UPLOADED.${extension}`;
            await writeFile(filePath, buf);
            // write cover image if exists
            const mimeMap = {
                    "image/jpeg": "jpg",
                    "image/png": "png",
                    "image/gif": "gif",
                    "image/webp": "webp",
                    "image/svg+xml": "svg",
                    "image/bmp": "bmp",
                };
            let imageBasename: string | undefined = undefined;
            if (metadata.common.picture && metadata.common.picture.length > 0) {
                console.log("Writing image...");
                const exists = existsSync(path.join(options.path!, 'assets'));
                if (!exists) await mkdir(path.join(options.path!, 'assets'));
                const mime = metadata.common.picture[0].format;

                imageBasename = `${id}.${mimeMap[mime]}`;

                await writeFile(`${options.path}/uploads/assets/${id}.${mimeMap[mime] ?? ".png"}`, metadata.common.picture[0].data);

            } else {
                console.log("No cover image found in song", id);
            }
            return new Song(
                id,
                metadata.common.title,
                metadata.common.artists || ['Unknown Artist'],
                metadata.common.album || 'Unknown Album',
                metadata.format.duration || 0,
                metadata.common.picture ? imageBasename : undefined, // image path defined in constructor
                filePath,
                mimeType
            );
        }
        throw new Error('Invalid status');
    }
    async getBuffer() {
        return readFile(this.path);
    }
    async getImageBuffer() {
        if (!this.coverImage) return null;
        try {
            if (this.coverImage.startsWith('data:')) {
                // Extract base64 data from data URL
                const base64Data = this.coverImage.split(',')[1];
                return Buffer.from(base64Data, 'base64');
            }
            const imgList = await readdir(path.join(path.dirname(this.path), 'assets'));
            if (!imgList.some(img => img.includes(this.id))) {
                console.error(`Cover image file ${this.id} not found in assets directory.`);
                return null;
            }
            const imageBasename = imgList.find(img => img.includes(this.id));
            const imgBuffer = await readFile(path.join(path.dirname(this.path), 'assets', imageBasename!));
            return imgBuffer;
        } catch (error) {
            console.error(`Error reading cover image for song ${this.id}: `, error);
            return null;
        }
    }
    async setImageBuffer(imgBuffer: Buffer, format: string) {
        const mimeMap = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/gif": "gif",
            "image/webp": "webp",
            "image/svg+xml": "svg",
            "image/bmp": "bmp",
        };
        const exists = existsSync(path.join(path.dirname(this.path), 'assets'));
        if (!exists) await mkdir(path.join(path.dirname(this.path), 'assets'));
        const imgList = await readdir(path.join(path.dirname(this.path), 'assets'));
        const oldBasename = imgList.find(img => img.includes(this.id))
        if (oldBasename) {
            console.log(`Removing old cover image for song ${this.id}`);
            await rm(path.join(path.dirname(this.path), 'assets', oldBasename!));

        }
        
        const imageBasename = `${this.id}.${mimeMap[format] || 'jpg'}`;
        await writeFile(`${path.dirname(this.path)}/assets/${imageBasename}`, imgBuffer);
        
        this.coverImage = imageBasename;
    }
    export() {
        return {
            id: this.id,
            path: this.path

        }
    }
}