import { Options } from "../../interfaces/types";
import type { UserRecord } from "firebase-admin/auth";
import type { User, PendingRequest } from "../../interfaces/types";

export interface Room {
    id: string;
    name: string;
    dirs: string[];
}
export interface AuthState {
    authenticated: boolean;
    user?: UserRecord;
    api?: string;

}
export type { Options, User, PendingRequest };