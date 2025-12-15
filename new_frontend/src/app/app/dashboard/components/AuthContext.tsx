
import type { User } from "firebase/auth";
import { createContext, Dispatch } from "react";


export const AuthContext = createContext<{
    user: User | null;
    setUser: Dispatch<React.SetStateAction<User | null>>;
}>({
    user: null,
    setUser: () => {},
});