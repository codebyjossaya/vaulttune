export class SongError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SongError';
    }
}