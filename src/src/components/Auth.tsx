import { useState } from "react";

import { Loading } from "./Loading";
import { Overlay } from "./Overlay";
import { SideOverlay } from "./SideOverlay";
type AuthProps = {
    // Add your prop definitions here, for example:
    title?: string;
    signIn: (api: string) => Promise<void>;
};

export function Auth({ title, signIn }: AuthProps) {
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | undefined>(undefined);
    const [apiOverlay, setApiOverlay] = useState<boolean>(false);
    const [apiVal, setAPIVal] = useState<string>("https://vaulttune.jcamille.tech");
    const [apiValue, setAPIValue] = useState<string>("https://vaulttune.jcamille.tech");
    const apiOverlayElement = (
        <SideOverlay isOpen={apiOverlay} onClose={() => setApiOverlay(false)}>
            <div className="api-overlay-content">
                <h2>Use your custom API</h2>
                <a>Learn more about self hosting the VaultTune API</a>
                <div>
                    <p>If you self host a VaultTune frontend AND backend, enter the URL to the frontend here.</p>
                    <input  type="text" 
                            className="text_input" 
                            placeholder={apiValue}
                            onChange={(e) => setAPIValue(e.target.value)}
                            
                    />
                </div>
                <button onClick={() => {
                    if (!apiValue.startsWith("http://") && !apiValue.startsWith("https://")) {
                        setError("API URL must start with http:// or https://");
                        return;
                    }
                    setAPIVal(apiValue)
                    setApiOverlay(false);
                }}>Save</button>
                <button onClick={() => setApiOverlay(false)}>Close</button>
            </div>
        </SideOverlay>
    );

    const visible = (
        <Overlay>
            <h1>There was an error</h1>
            <p>{error}</p>
            <button onClick={() => {setError(undefined)}}>Exit</button>
        </Overlay>
    )
    return (
        <>
        {apiOverlayElement}
        <div className='card-container'>
            {error ? visible : null}
            <div className="card">
                <h1>VaultTune</h1>
                <h2>{title || "Sign in"}</h2>
                {loading ? (<Loading text={"Waiting for sign in to complete..."}/>) : (
                    <>
                    <p>using <a onClick={() => setApiOverlay(true)}>{apiVal}</a></p>
                    <button onClick={() => {
                        setLoading(true);
                        signIn(apiVal).then(() => {
                            setLoading(false);
                        }).catch((err) => {
                            setError(err.message || "An error occurred during sign in.");
                            setLoading(false);
                        });
                    }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}> 
                    <span style={{ transform: 'rotate(225deg)', display: 'inline-block' }}>➔</span>
                        Open in new window
                    </button>
                    </>
                )}
            </div>
            
        </div>
        
        </>
        
    );
}
