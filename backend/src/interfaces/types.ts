
export enum SongStatus {
    UPLOADED = 'UPLOADED',
    SYSTEM = 'SYSTEM',
}

export class Options {
    public path: string | undefined;
    public id?: string;
    public name?: string | "Untitled Vault"
}

export class ServerOptions {
    public network?: boolean;
    public name?: string | "Untitled Vault";
    public token?: string;
    public api: string;
}



