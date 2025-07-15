import type { Auth } from "firebase/auth";
import { useState } from "react";

import { Loading } from "./Loading";
import { CustomGoogleButton as GoogleButton } from "./GoogleLogInButton";
import { Overlay } from "./Overlay";
type AuthProps = {
    // Add your prop definitions here, for example:
    title?: string;
    signIn: () => Promise<void>;
};

export function Auth({ title, signIn }: AuthProps) {
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | undefined>(undefined);
    const visible = (
        <Overlay>
            <h1>There was an error</h1>
            <p>{error}</p>
            <button onClick={() => {setError(undefined)}}>Exit</button>
        </Overlay>
    )
    return (
        <div className='card-container'>
            {error ? visible : null}
            <div className="card">
                <h1>VaultTune</h1>
                <h2>{title || "Sign in"}</h2>
                {loading ? (<Loading text={"Waiting for sign in to complete..."}/>) : (
                    <>
                        <GoogleButton onClick={() => {
                            setLoading(true);
                            signIn().catch(error => {
                                console.error("Error during sign in:", error);
                                setError(error instanceof Error ? error.message : "An unknown error occurred");
                            }).finally(() => setLoading(false));
                        }} />
                    </>
                )}
            </div>
            
        </div>
    );
}
