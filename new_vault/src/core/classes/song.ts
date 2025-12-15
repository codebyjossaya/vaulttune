import {IAudioMetadata, parseBlob, parseBuffer } from 'music-metadata'
import { readFile, writeFile } from 'fs/promises'
import { SongOptions, SongStatus } from '../../types/server_types.js'
import { SongError } from '../../types/errors.js';
import { existsSync } from 'fs';
export default class Song {
    public path;
    public metadata: IAudioMetadata;
    public id: string;
    private constructor(path: string, metadata: IAudioMetadata, id?: string | undefined) {
        this.path = path;
        this.metadata = metadata;

        const date: Date = new Date();
        const timestamp: string = date.toISOString();
        const random = Math.floor(Math.random() * 1000000);
        this.id = (id === undefined) ? `song_${timestamp}_${random}` : id;
    }

    static async create(status: SongStatus, blob: Blob | null, options: SongOptions): Promise<Song> {
        if (status === SongStatus.SYSTEM) {
            // Check if the file exists at the given path
            if (!existsSync(options.path!)) {
                throw new SongError(`Song file does not exist at path: ${options.path}`);
            }
            try {
                const buffer = await readFile(options.path!);
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
                return new Song(
                    options.path!,
                    metadata,
                    options.id
                );
            } catch (error) {
                throw new SongError(`Cannot read song: ${(error instanceof Error) ? error : String(error)}`)
            }
            
            
        } else if (status === SongStatus.UPLOADED) {
            if (!(blob instanceof Blob)) throw new Error("No blob provided")
            const metadata = await parseBlob(blob!);
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
            const uint8Array = await blob.bytes();
            const buffer = Buffer.from(uint8Array);
            const title = metadata.common.title|| 'Unknown_Title_UPLOADED'; // Default title if none exists
            const sanitizedTitle = title.replace(/[\\/:*?"<>|]/g, '_'); // Replace invalid filename characters
            metadata.common.title = sanitizedTitle;
            
            // Determine the file extension from metadata or use a default
            let extension = metadata.format.container || '';
            if (!extension || extension === 'MPEG') {
                extension = 'mp3'; // Use mp3 as default for mpeg audio
            }
            
            const filePath = `${options.path!}/${sanitizedTitle}_UPLOADED.${extension}`;
            await writeFile(filePath, buffer);
            return new Song(
                `${options.path!}/${sanitizedTitle}.${metadata.format.container}`,
                metadata,
            );
        }
        throw new Error('Invalid status');
    }
    async getBuffer() {
        return readFile(this.path);
    }
}