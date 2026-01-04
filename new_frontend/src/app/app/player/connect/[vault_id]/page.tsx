'use client';
import { SocketContext } from "@/app/components/SocketContext";
import { useContext, useState, useEffect, Usable, useRef } from "react";
import connectVault from "@/app/app/functions/connect";
import { Spinner } from "@/components/ui/spinner";
import { useRouter } from "next/navigation";
import { use } from "react";
import { ErrorContext } from "@/app/components/ErrorContext";


export default function Page({
    params
}: {
    params: { vault_id: string }
}
) {
    const socketCtx = useContext(SocketContext);
    const errorCtx = useContext(ErrorContext);
    const router = useRouter();
    const { vault_id } = use(params as unknown as Usable<unknown>) as { vault_id: string };
    const [connected, setConnected] = useState<boolean>(false);
    const [vaultName, setVaultName] = useState<string>("");
    const connectAttempts = useRef<number>(1);
    useEffect(() => {
        const token = document.cookie.split('auth_token=')[1]?.split(';')[0] || "";
        console.log(socketCtx);
        if (vault_id && socketCtx) {
            console.log("Connecting to vault ", vault_id);
            connectVault(vault_id as string, token).then((vault) => {
                setVaultName(vault.vault_name);
                socketCtx?.connect(vault.tunnel_url, token);
                console.log(socketCtx.data.name);
                socketCtx.data.name.current = vault.vault_name;
                const socket = socketCtx.socket!.current!;
                socket.on("connect", () => {
                    setConnected(true); 
                    router.push('/app/player/' + vault_id);
                });
                socket.on("connect_error", () => {

                    console.error(`Failed to connect to vault. Attempt #${connectAttempts}/5 `);
                    errorCtx.setError(`Failed to connect to vault. Attempt #${connectAttempts.current}/5 `);
                    connectAttempts.current += 1;
                    if (connectAttempts.current > 4) {
                        errorCtx.setError("Failed to connect to vault after multiple attempts. Please try again later.");
                        setTimeout(() => {
                            router.push('/app/dashboard');
                            errorCtx.setError(null);
                            connectAttempts.current = 1;
                            socketCtx.disconnect();
                        }, 2000);
                    }
                });
                socket.on("error", (err) => {
                    errorCtx.setError("Vault error:" + err)
                    
                });

            });

        }
    }, []);

    return (
            <div className="absolute h-screen w-screen top-0 flex justify-center items-center"
                style={{height: window.innerHeight}}
            >
                <div className="relative h-full lg:h-[30%] w-full lg:w-[30%] flex flex-col bg-black/30 rounded-lg p-5 justify-center">
                    {!connected ? (
                        <>
                            <Spinner className="place-self-center" />
                         {vaultName.length > 0 && (<h1 className="text-center place-self-center">Connecting to {vaultName} </h1>)}
                        </>
                        
                    ) : (
                        <p>Connected to vault!</p>
                    )}
                </div>

            </div>
    );

}