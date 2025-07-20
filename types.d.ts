import { UserRecord } from "firebase-admin/auth";
export interface serverToken {
    id: string;
    user: UserRecord;
}

export interface userVault {
    id: string;
    vault_name: string;
}

export interface Vault {
    id: string;
    vault_name: string;
    tunnel_url: string;
    users: string[];
    status: string;
}