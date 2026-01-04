
export interface User {
    readonly uid: string;
    readonly email?: string;
    readonly displayName?: string;
    readonly photoURL?: string;
    readonly phoneNumber?: string;
};

export interface serverToken {

    id: string;
    user: User;
}