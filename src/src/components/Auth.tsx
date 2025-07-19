import { useState } from "react";

import { Loading } from "./Loading";
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
                    
                    <button onClick={() => {
                        setLoading(true);
                        signIn().then(() => {
                            setLoading(false);
                        }).catch((err) => {
                            setError(err.message || "An error occurred during sign in.");
                            setLoading(false);
                        });
                    }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}> 
                    <span style={{ transform: 'rotate(225deg)', display: 'inline-block' }}>➔</span>
                        Open in new window
                    </button>
                    <small>or use DirectConnect</small>
                    </>
                )}
            </div>
            
        </div>
    );
}
