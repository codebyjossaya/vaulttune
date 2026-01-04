'use client';
import { ErrorContext } from "./ErrorContext";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircleIcon } from "lucide-react";

export default function ErrorProvider({ children }: { children: React.ReactNode }) {
    const [error, setError] = useState<string | null>(null);
    return (
        <ErrorContext.Provider value={{
            error,
            setError: (error) => {
                setError(error);
                setTimeout(() => {
                    setError(null);
                }, 10000);
            }
        }}>
            <Alert variant="destructive" className={`fixed top-5 right-10 bg-gray-700 transition-opacity ${error ? "opacity-100" : "opacity-0 pointer-events-none"} w-[3/10] z-100000`}>
                <AlertCircleIcon />
                <AlertTitle>An error has occurred.</AlertTitle>
                <AlertDescription className="text-red">{error}</AlertDescription>
            </Alert>
            {children}

        </ErrorContext.Provider>
    )
}
