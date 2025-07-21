import { Options } from "../../interfaces/types";
import type { UserRecord } from "firebase-admin/auth";

export interface Room {
    id: string;
    name: string;
    dirs: string[];
}
export interface AuthState {
    authenticated: boolean;
    user?: UserRecord;

}
export type { Options };