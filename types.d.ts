import { UserRecord } from "firebase-admin/auth";
export interface serverToken {
    id: string;
    user: UserRecord;
}

export interface userVault {
    id: string;
    vault_name: string;
    status: string;
}

export interface Vault {
    id: string;
    requests: VaultRequest[];
    vault_name: string;
    tunnel_urL : string
    owner: UserRecord;
    users: string[];
    status: "offline" | "online";
}

export interface VaultRequest {
    vault_id: string;
    owner: UserRecord;
    email: string;
    vault_name: string;
    created_at: string;
}
export interface UserVaultData {
    requests: VaultRequest[];
    [vaultId: string]: userVault;
}
