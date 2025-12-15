'use client';
import { SocketContext } from "@/app/components/SocketContext";
import { useContext, useState, useEffect, Usable } from "react";
import connectVault from "@/app/app/functions/connect";
import { Spinner } from "@/components/ui/spinner";
import { useRouter } from "next/navigation";
import { use } from "react";


export default function Page({
    params
}: {
    params: { vault_id: string }
}
) {
    const socketCtx = useContext(SocketContext);
    const router = useRouter();
    const { vault_id } = use(params as unknown as Usable<unknown>) as { vault_id: string };
    const [connected, setConnected] = useState<boolean>(false);
    const [vaultName, setVaultName] = useState<string>("");
    
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
                });
                socket.on("connect_error", (err) => {
                    console.error("Connection error: ", err);
                    
                });
                socket.on("error", (err) => {
                    console.error("Socket error: ", err);
                    
                });

            });

        }
    }, []);

    useEffect(() => {
        if (connected) {
            // Redirect to player page after connection
            router.push(`/app/player/${vault_id}`);
        }
    }, [connected, router, vault_id]);

    return (
            <div className="absolute h-screen w-screen top-0 flex justify-center items-center">
                <div className="relative h-[30%] w-[30%] flex flex-col bg-black/30 rounded-lg p-5 justify-center">
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