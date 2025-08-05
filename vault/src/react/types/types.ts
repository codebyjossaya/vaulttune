import { Options } from "../../interfaces/types";
import type { UserRecord } from "firebase-admin/auth";
import type { User, PendingRequest } from "../../interfaces/types";
import type { Room } from "../../interfaces/types";

export interface AuthState {
    authenticated: boolean;
    user?: UserRecord;
    id?: string;
    api?: string;

}

export type NotificationSetter = React.Dispatch<React.SetStateAction<{
  message: string;
  type: 'success' | 'error' | 'warning';
}[]>>;

export type AuthStateSetter = React.Dispatch<React.SetStateAction<AuthState>>;

export type { Options, User, PendingRequest, Room };