import { Room } from "src/types/types";
export enum SongStatus {
    UPLOADED = 'UPLOADED',
    SYSTEM = 'SYSTEM',
}

export class ServerOptions {
    public network?: boolean;
    public name?: string | "Untitled Vault";
    public token?: string;
    public api?: string;
}

export class Options extends ServerOptions {
    public rooms: Room[];
    public users?: string[];
}

export class SongOptions {
    public path?: string;
    public id?: string;
}
