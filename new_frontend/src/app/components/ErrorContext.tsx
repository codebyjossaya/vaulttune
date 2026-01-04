'use client';
import { createContext } from "react";
export const ErrorContext = createContext<{
    error: string | null;
    setError: (error: string | null) => void;
}>({
    error: null,
    setError: () => {},
});