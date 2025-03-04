import {ICommonTagsResult, parseBlob, parseBuffer } from 'music-metadata'
import { readFileSync, writeFileSync } from 'fs'
import { Options, SongStatus } from '../types'

export class Song {
    public path;
    public metadata: ICommonTagsResult;
    public id;
    private buffer: ArrayBuffer
    private constructor(path: string, metadata: ICommonTagsResult, buffer: ArrayBuffer, id: string | null = null) {
        this.path = path;
        this.metadata = metadata;
        this.buffer = buffer;
        const date: Date = new Date();
        const timestamp: string = date.toISOString();
        const random = Math.floor(Math.random() * 1000000);
        this.id = (id === undefined) ? `room_${timestamp}_${random}` : id;
    }

    static async create(status: SongStatus, blob: Blob | null, options: Options): Promise<Song> {
        if(status === SongStatus.SYSTEM) {
            const buffer = readFileSync(options.path!);
            const metadata = await parseBuffer(buffer);
            return new Song(
                options.path!,
                metadata.common,
                buffer
            );
        } else if (status === SongStatus.UPLOADED) {
            if (!(blob instanceof Blob)) throw new Error("No blob provided")
            const metadata = await parseBlob(blob!)
            const buffer = await blob.arrayBuffer()
            writeFileSync(options.path!,new DataView(buffer))
            return new Song(
                options.path!,
                metadata.common,
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
            path: this.path,
            metadata: this.metadata,
            id: this.id,
        }
    }
}