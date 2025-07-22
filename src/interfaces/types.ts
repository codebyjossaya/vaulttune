import { UserRecord } from "node_modules/firebase-admin/lib/auth";
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

export class User {
    public uid: string;
    public name: string;
    public email: string;
    public avatar?: string;
}

export class PendingRequest {
    public vault_id: string;
    public owner: UserRecord;
    public vault_name: string;
    public status: 'pending' | 'accepted' | 'rejected';
    public created_at: string;
    public email: string;
}