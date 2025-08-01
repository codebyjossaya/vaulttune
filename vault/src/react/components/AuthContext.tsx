import { createContext } from 'react';
import type { AuthStateSetter, AuthState } from '../types/types';
export const AuthContext = createContext<{ authState: AuthState; setAuthState: AuthStateSetter } | null>(null);