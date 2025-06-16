import {IAudioMetadata, parseBlob, parseBuffer } from 'music-metadata'
import { readFileSync, writeFileSync } from 'fs'
import { Options, SongStatus } from '../interfaces/types'

export default class Song {
    public path;
    public metadata: IAudioMetadata;
    public id: string;
    public buffer: ArrayBuffer
    public size: number;
    private constructor(path: string, metadata: IAudioMetadata, buffer: ArrayBuffer, id: string | undefined = undefined) {
        this.path = path;
        this.metadata = metadata;
        this.buffer = buffer;
        this.size = buffer.byteLength
        const date: Date = new Date();
        const timestamp: string = date.toISOString();
        const random = Math.floor(Math.random() * 1000000);
        this.id = (id === undefined) ? `song_${timestamp}_${random}` : id;
    }

    static async create(status: SongStatus, blob: Blob | null, options: Options): Promise<Song> {
        if(status === SongStatus.SYSTEM) {
            const buffer = readFileSync(options.path!);
            const metadata = await parseBuffer(buffer);
            return new Song(
                options.path!,
                metadata,
                buffer
            );
        } else if (status === SongStatus.UPLOADED) {
            if (!(blob instanceof Blob)) throw new Error("No blob provided")
            const metadata = await parseBlob(blob!)
            const buffer = await blob.arrayBuffer()
            const title = metadata.common.title|| 'Unknown_Title_UPLOADED'; // Default title if none exists
            const sanitizedTitle = title.replace(/[\\/:*?"<>|]/g, '_'); // Replace invalid filename characters
            metadata.common.title = sanitizedTitle;
            
            // Determine the file extension from metadata or use a default
            let extension = metadata.format.container || '';
            if (!extension || extension === 'MPEG') {
                extension = 'mp3'; // Use mp3 as default for mpeg audio
            }
            
            const filePath = `${options.path!}/${sanitizedTitle}_UPLOADED.${extension}`;
            writeFileSync(filePath, new DataView(buffer));
            return new Song(
                `${options.path!}/${sanitizedTitle}.${metadata.format.container}`,
                metadata,
                buffer
            );
        }
        throw new Error('Invalid status');
    }
    getBuffer() {
        return this.buffer;
    }
    exportSong() {
        return {
            metadata: this.metadata,
            id: this.id,
        }
    }
}